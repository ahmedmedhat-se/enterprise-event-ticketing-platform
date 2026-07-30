export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  paymentId: string | null;
  serviceFee: string | null;
  ticketsPrice: string | null;
  grandTotal: string | null;
  createdAt: string;
}

export interface CreateBookingPayload {
  eventId: string;
  seatIds: string[];
  tierId: string;
  quantity: number;
}
