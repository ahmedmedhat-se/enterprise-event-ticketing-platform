import apiClient from '../shared/api/client';
import type { Booking, CreateBookingPayload } from '../types/booking.types';

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const { data } = await apiClient.post<Booking>('/bookings', payload);
  return data;
}

export async function getBookings(): Promise<Booking[]> {
  const { data } = await apiClient.get<Booking[]>('/bookings');
  return data;
}

export async function getBookingById(id: string): Promise<Booking> {
  const { data } = await apiClient.get<Booking>(`/bookings/${id}`);
  return data;
}

export async function cancelBooking(id: string): Promise<void> {
  await apiClient.post(`/bookings/${id}/cancel`);
}
