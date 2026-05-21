import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateNotificationInput,
  NotificationService,
} from '@/services/notifications/NotificationService';
import type { TablesUpdate } from '@/integrations/supabase/types';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useCreateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateNotificationInput) => NotificationService.createNotification(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useUpdateNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'admin_notifications'> }) =>
      NotificationService.updateNotification(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  });
}