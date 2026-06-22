import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  type NotificationRow,
  NotificationService,
} from '@/services/notifications/NotificationService';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export function useNotificationsQuery(limit = 20): UseQueryResult<NotificationRow[], Error> {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, limit],
    queryFn: () => NotificationService.fetchNotifications(limit),
    staleTime: 60_000,
  });
}
