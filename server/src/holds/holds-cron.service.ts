import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SeatHoldService } from './holds.service';

/**
 * Cron job that periodically scans for seats marked as `held` in the database
 * but whose Redis hold key has expired (or was otherwise removed).
 *
 * This is a safety net for cases where:
 * - A Redis key expired naturally but the DB was not updated.
 * - The server crashed before releasing a hold.
 * - A keyspace notification was missed.
 *
 * Runs every 5 seconds.
 */
@Injectable()
export class HoldsCronService {
  private readonly logger = new Logger(HoldsCronService.name);

  constructor(private readonly seatHoldService: SeatHoldService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async cleanupStaleHolds(): Promise<void> {
    try {
      // 1. Get all seat IDs with status = 'held' from DB
      const heldSeatIds = await this.seatHoldService.getHeldSeatIds();

      if (heldSeatIds.length === 0) return;

      // 2. For each held seat, check if the Redis hold key still exists
      const staleIds: string[] = [];
      for (const seatId of heldSeatIds) {
        const isHeld = await this.seatHoldService.isSeatHeldInRedis(seatId);
        if (!isHeld) {
          staleIds.push(seatId);
        }
      }

      // 3. Release stale holds
      if (staleIds.length > 0) {
        this.logger.log(
          `Releasing ${staleIds.length} stale hold(s): ${staleIds.join(', ')}`,
        );

        for (const seatId of staleIds) {
          try {
            await this.seatHoldService.releaseHold(seatId);
          } catch (err) {
            this.logger.error(
              `Failed to release stale hold for seat ${seatId}: ${(err as Error).message}`,
            );
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `Error during stale hold cleanup: ${(err as Error).message}`,
      );
    }
  }
}
