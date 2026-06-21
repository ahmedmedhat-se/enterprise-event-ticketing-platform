import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql, gte, lte } from 'drizzle-orm';
import * as schema from '../database/';
import type { Database } from '../database/database.types';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('DRIZZLE_DB') private readonly db: Database) {}

  async createEvent(organizerId: string, dto: CreateEventDto) {
    const organizer = await this.getOrganizerProfile(organizerId);
    if (!organizer) {
      throw new NotFoundException('Organizer account not found');
    }
    if (organizer.approvalStatus !== 'approved') {
      throw new ForbiddenException(
        'Your organizer account is pending approval. You cannot create events yet.',
      );
    }

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

    if (dto.eventType === 'general_admission' && !dto.totalCapacity) {
      throw new BadRequestException(
        'totalCapacity is required for general admission events.',
      );
    }

    const totalSeats = dto.pricingTiers.reduce(
      (sum, t) => sum + t.seatsCount,
      0,
    );

    return this.db.transaction(async (tx) => {
      const [event] = await tx
        .insert(schema.events)
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

      // Track seat row/offset across all tiers to avoid duplicates
      let currentRow = 'A';
      let currentOffset = 0; // 0‑based index inside the row

      for (const tierDto of dto.pricingTiers) {
        const [tier] = await tx
          .insert(schema.pricingTiers)
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
          } as any)
          .returning();

        if (dto.eventType === 'seated') {
          const next = await this.generateSeats(
            tx,
            event.id,
            tier.id,
            tierDto.seatsCount,
            currentRow,
            currentOffset,
          );
          currentRow = next.row;
          currentOffset = next.offset;
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

    if (dto.eventType && dto.eventType !== event.eventType) {
      throw new BadRequestException('Cannot change event type after creation.');
    }

    const updatedFields: Partial<typeof schema.events.$inferInsert> = {};

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
        .update(schema.events)
        .set(updatedFields)
        .where(eq(schema.events.id, eventId));
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
      await tx
        .delete(schema.tickets)
        .where(eq(schema.tickets.eventId, eventId));
      await tx
        .delete(schema.waitlist)
        .where(eq(schema.waitlist.eventId, eventId));
      await tx
        .delete(schema.bookings)
        .where(eq(schema.bookings.eventId, eventId));
      await tx.delete(schema.seats).where(eq(schema.seats.eventId, eventId));
      await tx
        .delete(schema.pricingTiers)
        .where(eq(schema.pricingTiers.eventId, eventId));
      await tx.delete(schema.events).where(eq(schema.events.id, eventId));
    });

    this.logger.log(`Event ${eventId} deleted by organizer ${organizerId}`);
  }

  async getOrganizerEvents(organizerId: string) {
    return this.db.query.events.findMany({
      where: eq(schema.events.organizerId, organizerId),
      with: { pricingTiers: true },
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });
  }

  async getEventById(eventId: string) {
    return this.findEventByIdOrFail(eventId);
  }

  async getPublicEvents(dto: ListEventsDto) {
    const conditions: ReturnType<typeof sql>[] = [];
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    if (dto.search) {
      conditions.push(
        sql`(${schema.events.name} ILIKE ${`%${dto.search}%`} OR ${schema.events.description} ILIKE ${`%${dto.search}%`})`,
      );
    }
    if (dto.city) {
      conditions.push(sql`${schema.events.city} ILIKE ${`%${dto.city}%`}`);
    }
    if (dto.country) {
      conditions.push(
        sql`${schema.events.country} ILIKE ${`%${dto.country}%`}`,
      );
    }
    if (dto.eventType) {
      conditions.push(eq(schema.events.eventType, dto.eventType));
    }
    if (dto.dateFrom) {
      conditions.push(gte(schema.events.date, new Date(dto.dateFrom)));
    }
    if (dto.dateTo) {
      conditions.push(lte(schema.events.date, new Date(dto.dateTo)));
    }

    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.db.query.events.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: { pricingTiers: true },
        orderBy: (events, { asc }) => [asc(events.date)],
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.events)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    return {
      data: rows,
      meta: {
        page,
        limit,
        total: Number(total[0].count),
        totalPages: Math.ceil(Number(total[0].count) / limit),
      },
    };
  }

  // ── Private helpers ──

  private async findEventByIdOrFail(eventId: string) {
    const event = await this.db.query.events.findFirst({
      where: eq(schema.events.id, eventId),
      with: { pricingTiers: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  private async getOrganizerProfile(userId: string) {
    const result = await this.db.query.users.findFirst({
      where: and(
        eq(schema.users.id, userId),
        eq(schema.users.role, 'organizer'),
      ),
      with: { organizerAccount: true },
    });
    return result?.organizerAccount ?? null;
  }

  /**
   * Generate seats for a tier, continuing from the given row and offset.
   * Returns the next row and offset after generation.
   */
  private async generateSeats(
    tx: any,
    eventId: string,
    tierId: string,
    seatCount: number,
    startRow: string,
    startOffset: number,
  ): Promise<{ row: string; offset: number }> {
    const SEATS_PER_ROW = 20;
    let rowChar = startRow.charCodeAt(0);
    let offset = startOffset;

    for (let i = 0; i < seatCount; i++) {
      const row = String.fromCharCode(rowChar);
      const number = offset + 1; // 1‑based seat number

      await tx.insert(schema.seats).values({
        eventId,
        tierId,
        seatRow: row,
        seatNumber: number,
        status: 'available',
      });

      offset++;
      if (offset >= SEATS_PER_ROW) {
        rowChar++;
        offset = 0;
      }
    }

    return { row: String.fromCharCode(rowChar), offset };
  }
}
