import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql, gte, lte, inArray } from 'drizzle-orm';
import * as schema from '../database/';
import type { Database } from 'src/types/database.types';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ListEventsDto } from './dto/list-events.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly DEFAULT_SEATS_PER_ROW = 20;

  constructor(@Inject('DRIZZLE_DB') private readonly db: Database) {}

  // ── CREATE EVENT ────────────────────────────────────────────
  async createEvent(organizerId: string, dto: CreateEventDto) {
    const organizer = await this.getOrganizerProfile(organizerId);
    if (!organizer) throw new NotFoundException('Organizer account not found');
    if (organizer.approvalStatus !== 'approved')
      throw new ForbiddenException('Your organizer account is not approved.');

    const salesStart = new Date(dto.salesStartAt);
    const eventDate = new Date(dto.date);
    const salesEnd = dto.salesEndAt ? new Date(dto.salesEndAt) : null;

    if (salesStart >= eventDate)
      throw new BadRequestException(
        'Sales start date must be before the event date.',
      );
    if (salesEnd && salesEnd <= salesStart)
      throw new BadRequestException(
        'Sales end date must be after sales start date.',
      );
    if (dto.eventType === 'general_admission' && !dto.totalCapacity)
      throw new BadRequestException(
        'totalCapacity is required for general admission events.',
      );

    const totalSeats = dto.seatMap
      ? dto.seatMap.reduce((sum, row) => sum + row.seats, 0)
      : dto.pricingTiers.reduce((sum, t) => sum + (t.seatsCount ?? 0), 0);

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

      if (dto.eventType === 'seated') {
        if (dto.seatMap) {
          await this.createSeatsFromMap(
            tx,
            event.id,
            dto.pricingTiers,
            dto.seatMap,
          );
        } else {
          await this.autoGenerateSeats(tx, event.id, dto.pricingTiers);
        }
      } else {
        // General admission – insert tiers only
        for (const tierDto of dto.pricingTiers) {
          await tx.insert(schema.pricingTiers).values({
            eventId: event.id,
            tierName: tierDto.tierName,
            price: tierDto.price,
            seatsCount: tierDto.seatsCount ?? 0,
            earlyBirdPrice: tierDto.earlyBirdPrice ?? null,
            earlyBirdExpiration: tierDto.earlyBirdExpiration
              ? new Date(tierDto.earlyBirdExpiration)
              : null,
            maxPerOrder: tierDto.maxPerOrder ?? null,
          } as any);
        }
      }

      this.logger.log(`Event ${event.id} created by organizer ${organizerId}`);
      return event;
    });
  }

  // ── UPDATE EVENT ────────────────────────────────────────────
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

  // ── DELETE EVENT ────────────────────────────────────────────
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
    return { message: 'Event deleted successfully' };
  }

  // ── LIST ORGANIZER EVENTS ───────────────────────────────────
  async getOrganizerEvents(organizerId: string) {
    // Fetch events with pricing tiers
    const eventsList = await this.db.query.events.findMany({
      where: eq(schema.events.organizerId, organizerId),
      with: { pricingTiers: true },
      orderBy: (events, { desc }) => [desc(events.createdAt)],
    });

    if (eventsList.length === 0) return [];

    // Separate seated and GA events
    const seatedEvents = eventsList.filter((e) => e.eventType === 'seated');
    const gaEvents = eventsList.filter(
      (e) => e.eventType === 'general_admission',
    );

    // If there are seated events, batch‑fetch their seat summaries
    if (seatedEvents.length > 0) {
      const seatedIds = seatedEvents.map((e) => e.id);

      // 1) Layout: row labels + seat counts per event/row/tier
      const rowLayouts = await this.db
        .select({
          eventId: schema.seats.eventId,
          row: schema.seats.seatRow,
          tierId: schema.seats.tierId,
          seatCount: sql<number>`cast(max(${schema.seats.seatNumber}) as int)`,
        })
        .from(schema.seats)
        .where(inArray(schema.seats.eventId, seatedIds))
        .groupBy(
          schema.seats.eventId,
          schema.seats.seatRow,
          schema.seats.tierId,
        )
        .orderBy(sql`min(${schema.seats.seatNumber})`);

      // 2) Occupied seats (held + booked)
      const occupied = await this.db
        .select({
          eventId: schema.seats.eventId,
          row: schema.seats.seatRow,
          number: schema.seats.seatNumber,
          status: schema.seats.status,
        })
        .from(schema.seats)
        .where(
          and(
            inArray(schema.seats.eventId, seatedIds),
            inArray(schema.seats.status, ['held', 'booked']),
          ),
        );

      // Group by event
      const layoutByEvent = new Map<string, any[]>();
      for (const l of rowLayouts) {
        if (!layoutByEvent.has(l.eventId)) layoutByEvent.set(l.eventId, []);
        layoutByEvent.get(l.eventId)!.push(l);
      }

      const occupiedByEvent = new Map<string, any[]>();
      for (const o of occupied) {
        if (!occupiedByEvent.has(o.eventId)) occupiedByEvent.set(o.eventId, []);
        occupiedByEvent.get(o.eventId)!.push(o);
      }

      // Merge into each seated event
      for (const event of seatedEvents) {
        const tierMap = new Map(
          event.pricingTiers.map((t) => [
            t.id,
            { name: t.tierName, price: t.price },
          ]),
        );

        const rows = layoutByEvent.get(event.id) ?? [];
        const occupiedRows = occupiedByEvent.get(event.id) ?? [];

        const seatLayout = rows.map((r) => ({
          row: r.row,
          seats: r.seatCount,
          ...tierMap.get(r.tierId),
        }));

        const held: string[] = [];
        const sold: string[] = [];
        for (const o of occupiedRows) {
          const ref = `${o.row}${o.number}`;
          if (o.status === 'held') held.push(ref);
          else if (o.status === 'booked') sold.push(ref);
        }

        (event as any).seatLayout = seatLayout;
        (event as any).seatStatus = { held, sold };
      }
    }

    // Mix back together: GA events stay as‑is
    return [...seatedEvents, ...gaEvents].sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0),
    );
  }

  // ── GET SINGLE EVENT ────────────────────────────────────────
  async getEventById(eventId: string) {
    return this.findEventByIdOrFail(eventId);
  }

  // ── PUBLIC EVENT LISTING ────────────────────────────────────
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

  // ── PRIVATE HELPERS ─────────────────────────────────────────

  private async findEventByIdOrFail(eventId: string) {
    const event = await this.db.query.events.findFirst({
      where: eq(schema.events.id, eventId),
      with: { pricingTiers: true },
    });
    if (!event) throw new NotFoundException('Event not found');

    // For seated events, attach a lightweight seat map
    if (event.eventType === 'seated') {
      const { rows, occupied } = await this.getSeatMapSummary(eventId);

      // Build a map from tierId to tier name/price
      const tierMap = new Map(
        event.pricingTiers.map((t) => [
          t.id,
          { name: t.tierName, price: t.price },
        ]),
      );

      const seatLayout = rows.map((r) => ({
        row: r.row,
        seats: r.seatCount,
        ...tierMap.get(r.tierId),
      }));

      const held: string[] = [];
      const sold: string[] = [];
      for (const s of occupied) {
        const ref = `${s.row}${s.number}`;
        if (s.status === 'held') held.push(ref);
        else if (s.status === 'booked') sold.push(ref);
      }

      return {
        ...event,
        seatLayout,
        seatStatus: { held, sold },
      };
    }

    // General admission – no seats
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

  private async getSeatMapSummary(eventId: string) {
    // Query 1: Row layout (row label, tierId, total seats)
    const rows = await this.db
      .select({
        row: schema.seats.seatRow,
        tierId: schema.seats.tierId,
        seatCount: sql<number>`cast(max(${schema.seats.seatNumber}) as int)`,
      })
      .from(schema.seats)
      .where(eq(schema.seats.eventId, eventId))
      .groupBy(schema.seats.seatRow, schema.seats.tierId)
      .orderBy(sql`min(${schema.seats.seatNumber})`);

    // Query 2: Held / sold seats
    const occupied = await this.db
      .select({
        row: schema.seats.seatRow,
        number: schema.seats.seatNumber,
        status: schema.seats.status,
      })
      .from(schema.seats)
      .where(
        and(
          eq(schema.seats.eventId, eventId),
          sql`${schema.seats.status} IN ('held', 'booked')`,
        ),
      );

    return { rows, occupied };
  }

  // ── CUSTOM SEAT MAP GENERATION ─────────────────────────────
  private async createSeatsFromMap(
    tx: any,
    eventId: string,
    tiers: CreateEventDto['pricingTiers'],
    seatMap: NonNullable<CreateEventDto['seatMap']>,
  ) {
    const allRowLabels = seatMap.map((r) => r.label);
    const assignedRows: string[] = tiers.flatMap((t) => t.rows ?? []);
    const unassigned = allRowLabels.filter((l) => !assignedRows.includes(l));
    const overAssigned = assignedRows.filter((l) => !allRowLabels.includes(l));

    if (unassigned.length > 0)
      throw new BadRequestException(
        `Rows not assigned to any tier: ${unassigned.join(', ')}`,
      );
    if (overAssigned.length > 0)
      throw new BadRequestException(
        `Rows assigned but not in seatMap: ${overAssigned.join(', ')}`,
      );

    const rowTierMap = new Map<string, string>();

    // Insert pricing tiers and build row → tierId mapping
    for (const tierDto of tiers) {
      const [tier] = await tx
        .insert(schema.pricingTiers)
        .values({
          eventId,
          tierName: tierDto.tierName,
          price: tierDto.price,
          seatsCount: 0, // will be updated later
          earlyBirdPrice: tierDto.earlyBirdPrice ?? null,
          earlyBirdExpiration: tierDto.earlyBirdExpiration
            ? new Date(tierDto.earlyBirdExpiration)
            : null,
          maxPerOrder: tierDto.maxPerOrder ?? null,
        } as any)
        .returning();

      for (const row of tierDto.rows ?? []) {
        rowTierMap.set(row, tier.id);
      }
    }

    // Generate seats for each row
    for (const rowDef of seatMap) {
      const tierId = rowTierMap.get(rowDef.label);
      if (!tierId) {
        throw new BadRequestException(
          `Row ${rowDef.label} not assigned to any tier`,
        );
      }
      for (let num = 1; num <= rowDef.seats; num++) {
        await tx.insert(schema.seats).values({
          eventId,
          tierId,
          seatRow: rowDef.label,
          seatNumber: num,
          status: 'available',
        });
      }
    }

    // Update seat counts in pricing tiers
    for (const tierDto of tiers) {
      const rows = tierDto.rows ?? [];
      if (rows.length > 0) {
        const tierId = rowTierMap.get(rows[0]!);
        if (tierId) {
          const count = seatMap
            .filter((r) => rows.includes(r.label))
            .reduce((sum, r) => sum + r.seats, 0);
          await tx
            .update(schema.pricingTiers)
            .set({ seatsCount: count })
            .where(eq(schema.pricingTiers.id, tierId));
        }
      }
    }
  }

  // ── AUTO-GENERATED SEAT LAYOUT ─────────────────────────────
  private async autoGenerateSeats(
    tx: any,
    eventId: string,
    tiers: CreateEventDto['pricingTiers'],
  ) {
    let currentRow = 'A';
    let offset = 0;

    for (const tierDto of tiers) {
      const [tier] = await tx
        .insert(schema.pricingTiers)
        .values({
          eventId,
          tierName: tierDto.tierName,
          price: tierDto.price,
          seatsCount: tierDto.seatsCount ?? 0,
          earlyBirdPrice: tierDto.earlyBirdPrice ?? null,
          earlyBirdExpiration: tierDto.earlyBirdExpiration
            ? new Date(tierDto.earlyBirdExpiration)
            : null,
          maxPerOrder: tierDto.maxPerOrder ?? null,
        } as any)
        .returning();

      const next = await this.generateSeats(
        tx,
        eventId,
        tier.id,
        tierDto.seatsCount ?? 0,
        currentRow,
        offset,
        this.DEFAULT_SEATS_PER_ROW,
      );
      currentRow = next.row;
      offset = next.offset;
    }
  }

  /**
   * Low‑level seat generator (continues across tiers).
   */
  private async generateSeats(
    tx: any,
    eventId: string,
    tierId: string,
    seatCount: number,
    startRow: string,
    startOffset: number,
    seatsPerRow: number,
  ): Promise<{ row: string; offset: number }> {
    let rowChar = startRow.charCodeAt(0);
    let offset = startOffset;

    for (let i = 0; i < seatCount; i++) {
      const row = String.fromCharCode(rowChar);
      const number = offset + 1;

      await tx.insert(schema.seats).values({
        eventId,
        tierId,
        seatRow: row,
        seatNumber: number,
        status: 'available',
      });

      offset++;
      if (offset >= seatsPerRow) {
        rowChar++;
        offset = 0;
      }
    }
    return { row: String.fromCharCode(rowChar), offset };
  }
}
