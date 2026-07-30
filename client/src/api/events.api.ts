import apiClient from '../shared/api/client';
import type {
  Event,
  ListEventsParams,
  PaginatedResponse,
} from '../shared/api/types';

export async function getEvents(params?: ListEventsParams): Promise<PaginatedResponse<Event>> {
  const res = await apiClient.get<PaginatedResponse<Event>>('/events', { params });
  return res.data;
}

export async function getEventById(id: string): Promise<Event> {
  const res = await apiClient.get<Event>(`/events/${id}`);
  return res.data;
}