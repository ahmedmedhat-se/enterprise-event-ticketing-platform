import { useQuery } from '@tanstack/react-query';
import type { ListEventsParams } from '../../../shared/api/types';
import { getEvents } from '../../../api/events.api';

export function useEvents(params?: ListEventsParams) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => getEvents(params),
  });
}
