import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and } from 'drizzle-orm';
import * as schema from '../database/';
import type { Database } from '../types/database.types';
import { RedisService } from '../database/redis.service';
import { HoldsGateway } from './holds.gateway';

const HOLD_KEY_PREFIX = 'hold:seat:';

export interface SeatStatusUpdate {
  seatId: string;
  status: 'available' | 'held' | 'booked';
}

@Injectable()
export class SeatHoldService {
  private readonly logger = new Logger(SeatHoldService.name);
  private readonly holdTtlMs: number;

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: Database,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly holdsGateway: HoldsGateway,
  ) {
    this.holdTtlMs =
      this.configService.get<number>('SEAT_HOLD_TTL_MS') ?? 300_000;
  }

  getHoldKey(seatId: string): string {
    return `${HOLD_KEY_PREFIX}${seatId}`;
  }

  /**
   * Attempt to hold a seat for a given user.
   * Uses SET NX (atomic ioredis command) combined with a DB transaction
   * to avoid race conditions.
   */
  async holdSeat(
    userId: string,
    eventId: string,
    seatId: string,
  ): Promise<void> {
    // 1. Check seat exists and is available in DB
    const [seat] = await this.db
      .select()
      .from(schema.seats)
      .where(eq(schema.seats.id, seatId))
      .limit(1);

    if (!seat) {
      throw new BadRequestException('Seat not found');
    }
    if (seat.status !== 'available') {
      throw new BadRequestException(
        `Seat is ${seat.status}, not available for hold`,
      );
    }

    // 2. Atomically set Redis hold key using SET NX (set if not exists)
    const holdKey = this.getHoldKey(seatId);
    const keySet = await this.redisService.setNx(
      holdKey,
      userId,
      this.holdTtlMs,
    );

    if (!keySet) {
      // Key already exists – seat is held by someone else
      throw new BadRequestException('Seat is already held by another user');
    }

    // 3. Update seat status in DB within a transaction
    try {
      await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(schema.seats)
          .where(eq(schema.seats.id, seatId))
          .limit(1);

        if (!current || current.status !== 'available') {
          throw new BadRequestException(
            `Seat is no longer available (status: ${current?.status ?? 'unknown'})`,
          );
        }

        await tx
          .update(schema.seats)
          .set({ status: 'held' })
          .where(eq(schema.seats.id, seatId));
      });
    } catch (err) {
      // DB transaction failed – roll back the Redis hold
      await this.redisService.del(holdKey);
      throw err;
    }

    this.logger.log(`Seat ${seatId} held by user ${userId}`);

    // Broadcast via gateway to the event room
    this.holdsGateway.broadcastToEvent(eventId, {
      seatId,
      status: 'held',
      eventId,
    });
  }

  /**
   * Release a held seat (mark available in both Redis and DB).
   *
   * Queries the seat's eventId from DB for broadcasting.
   */
  async releaseHold(seatId: string, requestingUserId?: string): Promise<void> {
    const holdKey = this.getHoldKey(seatId);

    // 1. Verify ownership if a user ID was provided
    if (requestingUserId) {
      const currentHolder = await this.redisService.get(holdKey);
      if (currentHolder && currentHolder !== requestingUserId) {
        throw new ForbiddenException(
          'You do not hold this seat; cannot release it',
        );
      }
    }

    // 2. Get the seat's eventId before updating (for broadcast)
    const [seat] = await this.db
      .select()
      .from(schema.seats)
      .where(eq(schema.seats.id, seatId))
      .limit(1);

    // 3. Remove Redis key
    await this.redisService.del(holdKey);

    // 4. Update DB – only if currently held
    await this.db
      .update(schema.seats)
      .set({ status: 'available' })
      .where(and(eq(schema.seats.id, seatId), eq(schema.seats.status, 'held')));

    this.logger.log(`Seat ${seatId} released`);

    // 5. Broadcast if we found the seat
    if (seat) {
      this.holdsGateway.broadcastToEvent(seat.eventId, {
        seatId,
        status: 'available',
        eventId: seat.eventId,
      });
    }
  }

  /**
   * Extend the TTL of an existing hold (e.g. during checkout).
   */
  async extendHold(seatId: string, userId: string): Promise<void> {
    const holdKey = this.getHoldKey(seatId);

    const currentHolder = await this.redisService.get(holdKey);
    if (!currentHolder) {
      throw new BadRequestException('No active hold found for this seat');
    }
    if (currentHolder !== userId) {
      throw new BadRequestException(
        'You do not hold this seat; cannot extend hold',
      );
    }

    // Re-set with new TTL
    await this.redisService.pexpire(holdKey, this.holdTtlMs);
    this.logger.log(`Hold extended for seat ${seatId} by user ${userId}`);
  }

  /**
   * Check if a Redis hold key still exists for a seat.
   * Used by the cron service.
   */
  async isSeatHeldInRedis(seatId: string): Promise<boolean> {
    const value = await this.redisService.get(this.getHoldKey(seatId));
    return value !== null;
  }

  /**
   * Get all currently held seat IDs (from DB status).
   */
  async getHeldSeatIds(): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.seats.id })
      .from(schema.seats)
      .where(eq(schema.seats.status, 'held'));

    return rows.map((r) => r.id);
  }
}
