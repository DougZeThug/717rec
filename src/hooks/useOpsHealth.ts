import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { supabase } from '@/integrations/supabase/client';
import { OpsHealthService } from '@/services/opsHealth/OpsHealthService';

export type RealtimeConnectionState = 'connecting' | 'connected' | 'error' | 'closed';

export interface RealtimeHealth {
  state: RealtimeConnectionState;
  lastChangeAt: Date | null;
}

export const useLastPowerSnapshot = () => {
  return useQuery({
    queryKey: ['ops-health', 'last-power-snapshot'],
    queryFn: () => OpsHealthService.fetchLastPowerSnapshot(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
};

export const usePendingOpsCounts = () => {
  return useQuery({
    queryKey: ['ops-health', 'pending-ops-counts'],
    queryFn: () => OpsHealthService.fetchPendingOpsCounts(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
};

/**
 * Subscribes to a lightweight realtime channel and reports connection health.
 * Uses postgres_changes on `matches` (any event) as the heartbeat; we only care
 * about the subscription lifecycle status, not the payloads.
 */
export const useRealtimeHealth = (): RealtimeHealth => {
  const [health, setHealth] = useState<RealtimeHealth>({
    state: 'connecting',
    lastChangeAt: null,
  });

  useEffect(() => {
    const { dispose } = subscribeWithRetry({
      label: 'ops-health-heartbeat',
      build: () =>
        supabase
          .channel('ops-health-heartbeat')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
            // no-op; presence of a message means the socket is alive
          }),
      onStatus: (status) => {
        let next: RealtimeConnectionState = 'connecting';
        if (status === 'SUBSCRIBED') next = 'connected';
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') next = 'error';
        else if (status === 'CLOSED') next = 'closed';
        setHealth({ state: next, lastChangeAt: new Date() });
      },
    });

    return () => {
      dispose();
    };
  }, []);

  return health;
};
