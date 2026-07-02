import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { fetchStageIdByTournament } from '@/services/brackets/read/BracketStageService';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Realtime hook for brackets-manager brackets.
 * Subscribes to the 'match' table (used by brackets-manager SQL storage)
 * instead of the legacy 'playoff_matches' table.
 *
 * If stageId is not provided, will attempt to fetch it from the database.
 */
export function useBracketsManagerRealtime(
  bracketId: string | null,
  providedStageId?: number | null
) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stageId, setStageId] = useState<number | null>(providedStageId ?? null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use refs to prevent subscription recreation when toast/queryClient change
  const toastRef = useRef(toast);
  const queryClientRef = useRef(queryClient);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    queryClientRef.current = queryClient;
  }, [queryClient]);

  // Fetch stageId if not provided
  useEffect(() => {
    if (providedStageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setStageId(providedStageId);
      return;
    }

    if (!bracketId) return;

    const fetchStageId = async () => {
      bracketLog('useBracketsManagerRealtime: Fetching stageId for bracket', { bracketId });

      try {
        const fetchedStageId = await fetchStageIdByTournament(bracketId);

        if (fetchedStageId !== null) {
          bracketLog('useBracketsManagerRealtime: Found stageId', {
            bracketId,
            stageId: fetchedStageId,
          });
          setStageId(fetchedStageId);
        }
      } catch (error) {
        errorLog('Failed to fetch stageId for realtime subscription', { bracketId, error });
      }
    };

    fetchStageId();
  }, [bracketId, providedStageId]);

  useEffect(() => {
    if (!bracketId || !stageId) {
      bracketLog('useBracketsManagerRealtime: Waiting for bracketId and stageId', {
        bracketId,
        stageId,
      });
      return;
    }

    bracketLog('Setting up realtime subscription for match table', { bracketId, stageId });

    const { dispose } = subscribeWithRetry({
      label: `useBracketsManagerRealtime(${bracketId},${stageId})`,
      build: () =>
        supabase
          .channel(`bracket-matches-${bracketId}-${stageId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'match',
              filter: `stage_id=eq.${stageId}`,
            },
            (payload) => {
              bracketLog('Match table updated via realtime:', payload);
              setLastUpdate(new Date());

              queryClientRef.current.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
              queryClientRef.current.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
              queryClientRef.current.refetchQueries({ queryKey: ['bracket-data', bracketId] });

              toastRef.current({
                title: 'Bracket Updated',
                description: 'Match scores have been updated.',
                duration: 3000,
              });
            }
          ),
      onStatus: (status) => {
        bracketLog('Realtime subscription status:', { status, bracketId, stageId });
        if (status === 'SUBSCRIBED') {
          setRealtimeEnabled(true);
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          setRealtimeEnabled(false);
        }
      },
      onReconnect: (isFirst) => {
        if (isFirst) return;
        // Refetch after reconnect to recover any missed events.
        queryClientRef.current.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
        queryClientRef.current.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
      },
    });

    return () => {
      bracketLog('Cleaning up match table realtime subscription');
      dispose();
      setRealtimeEnabled(false);
    };
  }, [bracketId, stageId]); // Only depend on bracketId and stageId - toast/queryClient accessed via refs

  return { realtimeEnabled, lastUpdate, stageId };
}
