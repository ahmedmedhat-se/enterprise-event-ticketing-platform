export type EventType = "seated" | "general_admission";
export type SeatStatus = "available" | "held" | "booked";

export interface PricingTier {
  id: string;
  eventId: string;
  tierName: string;
  price: string;
  seatsCount: number;
  earlyBirdPrice: string | null;
  earlyBirdExpiration: string | null;
  maxPerOrder: number | null;
}

export interface SeatLayoutRow {
  row: string;
  seats: number;
  name: string; // tier name
  price: string;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  tierId: string;
  status: SeatStatus;
}

export type SeatStatusMap = Record<string, "held" | "booked">;

export interface Event {
  id: string;
  organizerId: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  eventType: EventType;
  salesStartAt: string;
  salesEndAt: string | null;
  totalSeats: number | null;
  totalCapacity: number | null;
  date: string;
  createdAt: string;
  pricingTiers: PricingTier[];
  // Present only for seated events (from findEventByIdOrFail)
  seatLayout?: SeatLayoutRow[];
  seats?: Seat[]; // Full seat array with UUIDs — render the grid from this
  seatStatus?: SeatStatusMap; // Record<seatUuid, 'held' | 'booked'>
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ListEventsParams {
  search?: string;
  city?: string;
  country?: string;
  eventType?: EventType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}
