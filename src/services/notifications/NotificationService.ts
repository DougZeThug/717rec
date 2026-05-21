import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

export type NotificationRow = Tables<'admin_notifications'>;

const COLUMNS = 'id, title, body, created_by, created_at, updated_at, expires_at';

export interface CreateNotificationInput {
  title: string;
  body: string;
  createdBy: string | null;
  expiresAt?: string | null;
}

export const NotificationService = {
  fetchNotifications: async (limit = 20): Promise<NotificationRow[]> => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) handleDatabaseError(error, 'Failed to fetch notifications');
    return (data ?? []) as NotificationRow[];
  },

  createNotification: async (input: CreateNotificationInput): Promise<NotificationRow> => {
    const payload: TablesInsert<'admin_notifications'> = {
      title: input.title,
      body: input.body,
      created_by: input.createdBy,
      expires_at: input.expiresAt ?? null,
    };

    const { data, error } = await supabase
      .from('admin_notifications')
      .insert(payload)
      .select(COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to create notification');
    return ensureFound(data, 'Notification') as NotificationRow;
  },

  updateNotification: async (
    id: string,
    patch: TablesUpdate<'admin_notifications'>
  ): Promise<NotificationRow> => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) handleDatabaseError(error, 'Failed to update notification');
    return ensureFound(data, 'Notification', id) as NotificationRow;
  },

  deleteNotification: async (id: string): Promise<void> => {
    const { error } = await supabase.from('admin_notifications').delete().eq('id', id);
    if (error) handleDatabaseError(error, 'Failed to delete notification');
  },
};