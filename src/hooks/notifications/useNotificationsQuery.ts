import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { NotificationService, type NotificationRow } from '@/services/notifications/NotificationService';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const;

export function useNotificationsQuery(limit = 20): UseQueryResult<NotificationRow[], Error> {
  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => NotificationService.fetchNotifications(limit),
    staleTime: 60_000,
  });
}