import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, or, ilike, gte, lte, sql, SQL } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import {
  events,
  pricingTiers,
  seats,
  bookings,
  tickets,
  waitlist,
} from '../database/schema';
import type { Database } from '../database/database.types';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('DRIZZLE_DB') private readonly db: Database) {}

  async createEvent(organizerId: string, dto: CreateEventDto) {
    // 1. Validate organizer eligibility
    const organizer = await this.getOrganizerProfile(organizerId);
    if (!organizer) {
      throw new NotFoundException('Organizer account not found');
    }
    if (organizer.approvalStatus !== 'approved') {
      throw new ForbiddenException(
        'Your organizer account is pending approval. You cannot create events yet.',
      );
    }

    // 2. Validate event date logic
    const salesStart = new Date(dto.salesStartAt);
    const eventDate = new Date(dto.date);
    const salesEnd = dto.salesEndAt ? new Date(dto.salesEndAt) : null;

    if (salesStart >= eventDate) {
      throw new BadRequestException(
        'Sales start date must be before the event date.',
      );
    }
    if (salesEnd && salesEnd <= salesStart) {
      throw new BadRequestException(
        'Sales end date must be after sales start date.',
      );
    }

    // 3. For seated events, totalSeats will be computed from tiers; for GA, totalCapacity required
    if (dto.eventType === 'general_admission' && !dto.totalCapacity) {
      throw new BadRequestException(
        'total Capacity is required for general admission events.',
      );
    }

    const totalSeats = dto.pricingTiers.reduce(
      (sum, t) => sum + t.seatsCount,
      0,
    );

    return this.db.transaction(async (tx) => {
      // Insert event
      const [event] = await tx
        .insert(events)
        .values({
          organizerId,
          name: dto.name,
          description: dto.description ?? null,
          city: dto.city ?? null,
          country: dto.country ?? null,
          eventType: dto.eventType,
          salesStartAt: salesStart,
          salesEndAt: salesEnd,
          date: eventDate,
          totalSeats: dto.eventType === 'seated' ? totalSeats : null,
          totalCapacity:
            dto.eventType === 'general_admission' ? dto.totalCapacity! : null,
        })
        .returning();

      // Insert pricing tiers and (for seated) generate seats
      for (const tierDto of dto.pricingTiers) {
        const [tier] = await tx
          .insert(pricingTiers)
          .values({
            eventId: event.id,
            tierName: tierDto.tierName,
            price: tierDto.price,
            seatsCount: tierDto.seatsCount,
            earlyBirdPrice: tierDto.earlyBirdPrice ?? null,
            earlyBirdExpiration: tierDto.earlyBirdExpiration
              ? new Date(tierDto.earlyBirdExpiration)
              : null,
            maxPerOrder: tierDto.maxPerOrder ?? null,
          })
          .returning();

        if (dto.eventType === 'seated') {
          await this.generateSeats(tx, event.id, tier.id, tierDto.seatsCount);
        }
      }

      this.logger.log(`Event ${event.id} created by organizer ${organizerId}`);
      return event;
    });
  }

  async updateEvent(eventId: string, organizerId: string, dto: UpdateEventDto) {
    const event = await this.findEventByIdOrFail(eventId);
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only update your own events.');
    }

    const organizer = await this.getOrganizerProfile(organizerId);
    if (organizer?.approvalStatus !== 'approved') {
      throw new ForbiddenException('Your organizer account is not approved.');
    }

    // Validate new dates if provided
    if (dto.date && dto.salesStartAt) {
      const salesStart = new Date(dto.salesStartAt);
      const eventDate = new Date(dto.date);
      if (salesStart >= eventDate) {
        throw new BadRequestException(
          'Sales start must be before the event date.',
        );
      }
    }

    if (dto.salesEndAt) {
      const salesEnd = new Date(dto.salesEndAt);
      const salesStart = dto.salesStartAt
        ? new Date(dto.salesStartAt)
        : event.salesStartAt;
      if (salesEnd <= salesStart) {
        throw new BadRequestException('Sales end must be after sales start.');
      }
    }

    // For now, we do not allow changing eventType or tiers via update (complex)
    if (dto.eventType && dto.eventType !== event.eventType) {
      throw new BadRequestException('Cannot change event type after creation.');
    }

    const updatedFields: Partial<typeof events.$inferInsert> = {};

    if (dto.name !== undefined) updatedFields.name = dto.name;
    if (dto.description !== undefined)
      updatedFields.description = dto.description;
    if (dto.city !== undefined) updatedFields.city = dto.city;
    if (dto.country !== undefined) updatedFields.country = dto.country;
    if (dto.date !== undefined) updatedFields.date = new Date(dto.date);
    if (dto.salesStartAt !== undefined)
      updatedFields.salesStartAt = new Date(dto.salesStartAt);
    if (dto.salesEndAt !== undefined)
      updatedFields.salesEndAt = new Date(dto.salesEndAt);

    if (Object.keys(updatedFields).length > 0) {
      await this.db
        .update(events)
        .set(updatedFields)
        .where(eq(events.id, eventId));
      this.logger.log(`Event ${eventId} updated`);
    }

    return this.findEventByIdOrFail(eventId);
  }

  async deleteEvent(eventId: string, organizerId: string) {
    const event = await this.findEventByIdOrFail(eventId);
    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('You can only delete your own events.');
    }

    await this.db.transaction(async (tx) => {
      // Delete related entities in correct order to respect foreign keys
      await tx.delete(tickets).where(eq(tickets.eventId, eventId));
      await tx.delete(waitlist).where(eq(waitlist.eventId, eventId));
      await tx.delete(bookings).where(eq(bookings.eventId, eventId));
      await tx.delete(seats).where(eq(seats.eventId, eventId));
      await tx.delete(pricingTiers).where(eq(pricingTiers.eventId, eventId));
      await tx.delete(events).where(eq(events.id, eventId));
    });

    this.logger.log(`Event ${eventId} deleted by organizer ${organizerId}`);
  }

  async getOrganizerEvents(organizerId: string) {
    return this.db.query.events.findMany({
      where: eq(events.organizerId, organizerId),
      with: {
        pricingTiers: true,
      },
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });
  }

  async getEventById(eventId: string) {
    return this.findEventByIdOrFail(eventId);
  }

  async findEventByIdOrFail(eventId: string) {
    const event = await this.db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: {
        pricingTiers: true,
      },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  // ── private helpers ──

  private async getOrganizerProfile(userId: string) {
    const result = await this.db.query.users.findFirst({
      where: and(
        eq(schema.users.id, userId),
        eq(schema.users.role, 'organizer'),
      ),
      with: {
        organizerAccount: true,
      },
    });
    return result?.organizerAccount ?? null;
  }

  private async generateSeats(
    tx: PostgresJsDatabase<typeof schema>,
    eventId: string,
    tierId: string,
    seatCount: number,
  ) {
    const SEATS_PER_ROW = 20; // default, could be configurable
    let currentRowCode = 'A'.charCodeAt(0);
    let seatInRow = 0;

    for (let i = 0; i < seatCount; i++) {
      const row = String.fromCharCode(currentRowCode);
      const number = seatInRow + 1;

      await tx.insert(seats).values({
        eventId,
        tierId,
        seatRow: row,
        seatNumber: number,
        status: 'available',
      });

      seatInRow++;
      if (seatInRow >= SEATS_PER_ROW) {
        currentRowCode++;
        seatInRow = 0;
      }
    }
  }
  async getPublicEvents(dto: ListEventsDto) {
    const conditions: SQL[] = [];

    if (dto.search) {
      // search in name and description
      conditions.push(
        or(
          ilike(events.name, `%${dto.search}%`),
          ilike(events.description ?? sql`''`, `%${dto.search}%`),
        ),
      );
    }

    if (dto.city) {
      conditions.push(ilike(events.city ?? sql`''`, `%${dto.city}%`));
    }

    if (dto.country) {
      conditions.push(ilike(events.country ?? sql`''`, `%${dto.country}%`));
    }

    if (dto.eventType) {
      conditions.push(eq(events.eventType, dto.eventType));
    }

    if (dto.dateFrom) {
      conditions.push(gte(events.date, new Date(dto.dateFrom)));
    }

    if (dto.dateTo) {
      conditions.push(lte(events.date, new Date(dto.dateTo)));
    }

    const offset = (dto.page - 1) * dto.limit;

    const [rows, total] = await Promise.all([
      this.db.query.events.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          pricingTiers: true,
        },
        orderBy: (events, { asc }) => [asc(events.date)],
        limit: dto.limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      data: rows,
      meta: {
        page: dto.page,
        limit: dto.limit,
        total: Number(total[0].count),
        totalPages: Math.ceil(Number(total[0].count) / dto.limit),
      },
    };
  }
}
