import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/integrations/supabase/client';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useNotificationsRealtime(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_notifications' },
        () => {
          qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [qc]);
}