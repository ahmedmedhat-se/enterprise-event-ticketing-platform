import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { eq, and, inArray, sql } from 'drizzle-orm';
import crypto from 'crypto';
import * as schema from '../database/';
import type { Database } from '../types/database.types';
import { RedisService } from '../database/redis.service';
import { SeatHoldService } from '../holds/holds.service';
import { HoldsGateway } from '../holds/holds.gateway';
import { CreateBookingDto } from './dto/create-booking.dto';

// ── Types ──────────────────────────────────────────────────────

// Redis key helpers
const BOOKING_SEATS_PREFIX = 'booking:seats:';
const BOOKING_QUANTITY_PREFIX = 'booking:ga_qty:';

// ── Service ────────────────────────────────────────────────────

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly serviceFeePercent: number;
  private readonly ticketSecret: string;

  constructor(
    @Inject('DRIZZLE_DB') private readonly db: Database,
    private readonly redisService: RedisService,
    private readonly seatHoldService: SeatHoldService,
    private readonly holdsGateway: HoldsGateway,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.serviceFeePercent =
      this.configService.get<number>('SERVICE_FEE_PERCENT') ?? 5;
    this.ticketSecret =
      this.configService.get<string>('TICKET_SECRET') ??
      this.configService.get<string>('JWT_ACCESS_TOKEN_SECRET')!;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CREATE BOOKING
  // ═══════════════════════════════════════════════════════════════

  async createBooking(userId: string, dto: CreateBookingDto): Promise<any> {
    // 1. Look up event
    const event = await this.db.query.events.findFirst({
      where: eq(schema.events.id, dto.eventId),
      with: { pricingTiers: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    // 2. Validate sales window
    const now = new Date();
    if (now < event.salesStartAt) {
      throw new BadRequestException('Sales have not started yet');
    }
    if (event.salesEndAt && now > event.salesEndAt) {
      throw new BadRequestException('Sales have ended');
    }

    // 3. Branch on event type
    let booking: any;
    if (event.eventType === 'seated') {
      booking = await this.createSeatedBooking(
        userId,
        event,
        dto.seatIds ?? [],
      );
    } else {
      booking = await this.createGeneralAdmissionBooking(
        userId,
        event,
        dto.quantity ?? 1,
      );
    }

    this.logger.log(`Booking ${booking.id} created (pending)`);

    return booking;
  }

  // ── Seated event ─────────────────────────────────────────────

  private async createSeatedBooking(
    userId: string,
    event: any,
    seatIds: string[],
  ): Promise<any> {
    if (seatIds.length === 0) {
      throw new BadRequestException('seatIds required for seated events');
    }

    // Fetch seats
    const seats = await this.db
      .select()
      .from(schema.seats)
      .where(
        and(
          eq(schema.seats.eventId, event.id),
          inArray(schema.seats.id, seatIds),
        ),
      );

    if (seats.length !== seatIds.length) {
      throw new BadRequestException(
        'One or more seats do not belong to this event',
      );
    }

    // Validate every seat is held by this user in Redis
    const tierMap = new Map(event.pricingTiers.map((t: any) => [t.id, t]));
    let ticketsPrice = 0;

    for (const seat of seats) {
      if (seat.status !== 'held') {
        throw new BadRequestException(
          `Seat ${seat.seatRow}${seat.seatNumber} is ${seat.status}, not held`,
        );
      }

      const holdKey = this.seatHoldService.getHoldKey(seat.id);
      const holder = await this.redisService.get(holdKey);
      if (!holder) {
        throw new BadRequestException(
          `Seat ${seat.seatRow}${seat.seatNumber} hold has expired; please re-hold`,
        );
      }
      if (holder !== userId) {
        throw new BadRequestException(
          `Seat ${seat.seatRow}${seat.seatNumber} is held by a different user`,
        );
      }

      const tier = tierMap.get(seat.tierId);
      if (tier) {
        ticketsPrice += Number(this.getEffectivePrice(tier));
      }
    }

    const serviceFee = parseFloat(
      ((ticketsPrice * this.serviceFeePercent) / 100).toFixed(2),
    );
    const grandTotal = parseFloat((ticketsPrice + serviceFee).toFixed(2));

    // Create booking inside a transaction
    let booking: any;

    await this.db.transaction(async (tx: any) => {
      [booking] = await tx
        .insert(schema.bookings)
        .values({
          userId,
          eventId: event.id,
          status: 'pending',
          ticketsPrice: ticketsPrice.toString(),
          serviceFee: serviceFee.toString(),
          grandTotal: grandTotal.toString(),
        })
        .returning();

      // Extend hold TTLs for all seats
      for (const seat of seats) {
        try {
          await this.seatHoldService.extendHold(seat.id, userId);
        } catch {
          this.logger.warn(
            `Could not extend hold for seat ${seat.id} during booking creation`,
          );
        }
      }

      // Store seat IDs in Redis keyed by bookingId for later confirmation
      await this.redisService.setJson(
        BOOKING_SEATS_PREFIX + booking.id,
        seatIds,
        600_000,
      ); // 10 min TTL
    });

    this.logger.log(
      `Booking ${booking.id} created (pending, seated) for user ${userId}, event ${event.id}`,
    );

    return booking;
  }

  // ── General admission event ──────────────────────────────────

  private async createGeneralAdmissionBooking(
    userId: string,
    event: any,
    quantity: number,
  ): Promise<any> {
    if (!event.totalCapacity) {
      throw new BadRequestException(
        'This general admission event has no capacity configured',
      );
    }

    const confirmedCount = await this.countConfirmedBookings(event.id);
    const remaining = event.totalCapacity - confirmedCount;
    if (quantity > remaining) {
      throw new BadRequestException(
        `Only ${remaining} ticket(s) available, requested ${quantity}`,
      );
    }

    const tiers = event.pricingTiers ?? [];
    if (tiers.length === 0) {
      throw new BadRequestException(
        'No pricing tiers configured for this event',
      );
    }

    const tier = tiers[0];
    const unitPrice = Number(this.getEffectivePrice(tier));
    const ticketsPrice = parseFloat((unitPrice * quantity).toFixed(2));
    const serviceFee = parseFloat(
      ((ticketsPrice * this.serviceFeePercent) / 100).toFixed(2),
    );
    const grandTotal = parseFloat((ticketsPrice + serviceFee).toFixed(2));

    let booking: any;

    await this.db.transaction(async (tx: any) => {
      [booking] = await tx
        .insert(schema.bookings)
        .values({
          userId,
          eventId: event.id,
          status: 'pending',
          ticketsPrice: ticketsPrice.toString(),
          serviceFee: serviceFee.toString(),
          grandTotal: grandTotal.toString(),
        })
        .returning();

      // Store quantity in Redis for later confirmation
      await this.redisService.set(
        BOOKING_QUANTITY_PREFIX + booking.id,
        quantity.toString(),
        600_000,
      );
    });

    this.logger.log(
      `Booking ${booking.id} created (pending, GA x${quantity}) for user ${userId}`,
    );

    return booking;
  }

  // ═══════════════════════════════════════════════════════════════
  //  CONFIRM BOOKING (called after payment succeeds)
  // ═══════════════════════════════════════════════════════════════

  async confirmBooking(bookingId: string, paymentId: string): Promise<void> {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: { event: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'pending') {
      throw new BadRequestException(
        `Booking is already ${booking.status}; cannot confirm`,
      );
    }

    const eventType = booking.event?.eventType;

    await this.db.transaction(async (tx: any) => {
      // 1. Mark booking as confirmed
      await tx
        .update(schema.bookings)
        .set({ status: 'confirmed', paymentId })
        .where(eq(schema.bookings.id, bookingId));

      // 2. Handle seat-based (seated) or quantity-based (GA) ticket creation
      if (eventType === 'seated') {
        await this.confirmSeatedBooking(tx, booking, paymentId);
      } else {
        await this.confirmGABooking(tx, booking, paymentId);
      }

      // 3. Record payment transaction
      const amount = booking.grandTotal ?? '0';
      await tx.insert(schema.paymentTransactions).values({
        bookingId,
        amount: amount.toString(),
        currency: 'USD',
        status: 'succeeded',
        gateway: 'mock',
        gatewayTransactionId: paymentId,
      });
    });

    this.logger.log(`Booking ${bookingId} confirmed with payment ${paymentId}`);
  }

  private async confirmSeatedBooking(
    tx: any,
    booking: any,
    paymentId: string,
  ): Promise<void> {
    // Read seat IDs from Redis (stored during createBooking)
    const seatIds: string[] | null = await this.redisService.getJson<string[]>(
      BOOKING_SEATS_PREFIX + booking.id,
    );

    if (!seatIds || seatIds.length === 0) {
      throw new BadRequestException(
        'No seat data found for this booking; seats may have expired',
      );
    }

    // Fetch the seats that are still held
    const heldSeats = await tx
      .select()
      .from(schema.seats)
      .where(
        and(inArray(schema.seats.id, seatIds), eq(schema.seats.status, 'held')),
      );

    for (const seat of heldSeats) {
      const ticketId = crypto.randomUUID();
      const ticketNumber = this.generateTicketNumber(booking.eventId);
      const qrPayload = await this.jwtService.signAsync(
        {
          ticketId,
          bookingId: booking.id,
          eventId: booking.eventId,
          seatId: seat.id,
          userId: booking.userId,
          iat: Math.floor(Date.now() / 1000),
        },
        { secret: this.ticketSecret, expiresIn: '365d' },
      );

      await tx.insert(schema.tickets).values({
        id: ticketId,
        ticketNumber,
        bookingId: booking.id,
        seatId: seat.id,
        userId: booking.userId,
        eventId: booking.eventId,
        status: 'valid',
        qrCodePayload: qrPayload,
      });

      // Mark seat as booked
      await tx
        .update(schema.seats)
        .set({ status: 'booked' })
        .where(eq(schema.seats.id, seat.id));

      // Delete the Redis hold key
      const holdKey = this.seatHoldService.getHoldKey(seat.id);
      await this.redisService.del(holdKey);

      // Broadcast seat status update
      this.holdsGateway.broadcastToEvent(booking.eventId, {
        seatId: seat.id,
        status: 'booked',
        eventId: booking.eventId,
      });
    }

    // Clean up the Redis seat list
    await this.redisService.del(BOOKING_SEATS_PREFIX + booking.id);
  }

  private async confirmGABooking(
    tx: any,
    booking: any,
    paymentId: string,
  ): Promise<void> {
    // Read quantity from Redis
    const qtyStr = await this.redisService.get(
      BOOKING_QUANTITY_PREFIX + booking.id,
    );
    const quantity = qtyStr ? parseInt(qtyStr, 10) : 1;

    for (let i = 0; i < quantity; i++) {
      const ticketId = crypto.randomUUID();
      const ticketNumber = this.generateTicketNumber(booking.eventId);
      const qrPayload = await this.jwtService.signAsync(
        {
          ticketId,
          bookingId: booking.id,
          eventId: booking.eventId,
          userId: booking.userId,
          iat: Math.floor(Date.now() / 1000),
        },
        { secret: this.ticketSecret, expiresIn: '365d' },
      );

      await tx.insert(schema.tickets).values({
        id: ticketId,
        ticketNumber,
        bookingId: booking.id,
        seatId: null,
        userId: booking.userId,
        eventId: booking.eventId,
        status: 'valid',
        qrCodePayload: qrPayload,
      });
    }

    // Clean up Redis
    await this.redisService.del(BOOKING_QUANTITY_PREFIX + booking.id);
  }

  // ═══════════════════════════════════════════════════════════════
  //  CANCEL BOOKING
  // ═══════════════════════════════════════════════════════════════

  async cancelBooking(bookingId: string, userId: string): Promise<void> {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: { tickets: true, event: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId) {
      throw new ForbiddenException('This booking does not belong to you');
    }
    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw new BadRequestException(
        `Cannot cancel a booking with status "${booking.status}"`,
      );
    }

    await this.db.transaction(async (tx: any) => {
      // 1. Update booking status
      await tx
        .update(schema.bookings)
        .set({ status: 'cancelled' })
        .where(eq(schema.bookings.id, bookingId));

      // 2. Cancel all existing tickets (if confirmed)
      for (const ticket of booking.tickets) {
        await tx
          .update(schema.tickets)
          .set({ status: 'cancelled' })
          .where(eq(schema.tickets.id, ticket.id));

        // Release associated seat
        if (ticket.seatId) {
          await tx
            .update(schema.seats)
            .set({ status: 'available' })
            .where(eq(schema.seats.id, ticket.seatId));

          const holdKey = this.seatHoldService.getHoldKey(ticket.seatId);
          await this.redisService.del(holdKey);

          this.holdsGateway.broadcastToEvent(booking.eventId, {
            seatId: ticket.seatId,
            status: 'available',
            eventId: booking.eventId,
          });
        }
      }

      // 3. For pending bookings: release only the booking's own seats
      if (booking.status === 'pending') {
        // Read seat IDs from Redis (stored during createBooking)
        const seatIds: string[] | null = await this.redisService.getJson<
          string[]
        >(BOOKING_SEATS_PREFIX + booking.id);

        if (seatIds && seatIds.length > 0) {
          for (const seatId of seatIds) {
            await tx
              .update(schema.seats)
              .set({ status: 'available' })
              .where(eq(schema.seats.id, seatId));

            const holdKey = this.seatHoldService.getHoldKey(seatId);
            await this.redisService.del(holdKey);

            this.holdsGateway.broadcastToEvent(booking.eventId, {
              seatId,
              status: 'available',
              eventId: booking.eventId,
            });
          }

          await this.redisService.del(BOOKING_SEATS_PREFIX + booking.id);
        }

        // Also clean up GA quantity key if present
        await this.redisService.del(BOOKING_QUANTITY_PREFIX + booking.id);
      }

      // 4. Record refund payment transaction if was confirmed
      if (booking.status === 'confirmed') {
        await tx.insert(schema.paymentTransactions).values({
          bookingId,
          amount: booking.grandTotal ?? '0',
          currency: 'USD',
          status: 'refunded',
          gateway: 'mock',
          gatewayTransactionId: `refund_${booking.paymentId ?? 'unknown'}`,
        });
      }
    });

    this.logger.log(`Booking ${bookingId} cancelled by user ${userId}`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  BOOKING LOOKUP
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update the payment ID on a booking (called after creating payment intent).
   */
  async updatePaymentId(bookingId: string, paymentId: string): Promise<void> {
    await this.db
      .update(schema.bookings)
      .set({ paymentId })
      .where(eq(schema.bookings.id, bookingId));
  }

  async getUserBookings(userId: string): Promise<any[]> {
    // Fetch bookings with tickets; strip QR payloads from listing for security
    const bookings = await this.db.query.bookings.findMany({
      where: eq(schema.bookings.userId, userId),
      with: {
        event: true,
        tickets: {
          columns: {
            id: true,
            ticketNumber: true,
            bookingId: true,
            seatId: true,
            userId: true,
            eventId: true,
            status: true,
            checkedIn: true,
            checkInAt: true,
            // Explicitly omit qrCodePayload
          },
          with: {
            seat: true,
          },
        },
        paymentTransactions: true,
      },
      orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
    });

    return bookings;
  }

  async getBookingById(bookingId: string, userId?: string): Promise<any> {
    const booking = await this.db.query.bookings.findFirst({
      where: eq(schema.bookings.id, bookingId),
      with: {
        event: true,
        tickets: {
          with: {
            seat: true,
          },
        },
        paymentTransactions: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (userId && booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return booking;
  }

  // ═══════════════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════════════

  private getEffectivePrice(tier: any): string {
    if (tier.earlyBirdPrice && tier.earlyBirdExpiration) {
      const now = new Date();
      if (now < new Date(tier.earlyBirdExpiration)) {
        return tier.earlyBirdPrice;
      }
    }
    return tier.price;
  }

  private async countConfirmedBookings(eventId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(schema.bookings)
      .where(
        and(
          eq(schema.bookings.eventId, eventId),
          eq(schema.bookings.status, 'confirmed'),
        ),
      );
    return Number(result[0]?.count ?? 0);
  }

  private generateTicketNumber(eventId: string): string {
    const shortId = eventId.replace(/-/g, '').slice(0, 8);
    const random = crypto.randomBytes(4).toString('hex');
    return `TKT-${shortId}-${random}`;
  }
}
