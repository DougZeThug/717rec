import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { supabase } from '@/integrations/supabase/client';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useNotificationsRealtime(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const { dispose } = subscribeWithRetry({
      label: 'useNotificationsRealtime',
      build: () =>
        supabase
          .channel(`admin-notifications-realtime-${Math.random().toString(36).slice(2)}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'admin_notifications' },
            () => {
              qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
            }
          ),
      onReconnect: (isFirst) => {
        if (!isFirst) qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      },
    });
    return () => dispose();
  }, [qc]);
}
