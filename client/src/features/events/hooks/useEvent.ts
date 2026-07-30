import { useQuery } from '@tanstack/react-query';
import { getEventById } from '../../../api/events.api';

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => getEventById(id!),
    enabled: !!id,
  });
}
