import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Realtime hook for brackets-manager brackets.
 * Subscribes to the `match` table (used by brackets-manager SQL storage)
 * instead of the legacy `playoff_matches` table.
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
      setStageId(providedStageId);
      return;
    }

    if (!bracketId) return;

    const fetchStageId = async () => {
      bracketLog('useBracketsManagerRealtime: Fetching stageId for bracket', { bracketId });

      const { data, error } = await supabase
        .from('stage')
        .select('id')
        .eq('tournament_id', bracketId)
        .limit(1)
        .single();

      if (error) {
        errorLog('Failed to fetch stageId for realtime subscription', { bracketId, error });
        return;
      }

      if (data) {
        bracketLog('useBracketsManagerRealtime: Found stageId', { bracketId, stageId: data.id });
        setStageId(data.id);
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

    const channel = supabase
      .channel(`bracket-matches-${bracketId}-${stageId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'match',
          filter: `stage_id=eq.${stageId}`,
        },
        (payload) => {
          bracketLog('Match table updated via realtime:', payload);
          setLastUpdate(new Date());

          // Immediately invalidate and refetch the cache
          queryClientRef.current.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
          queryClientRef.current.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
          queryClientRef.current.refetchQueries({ queryKey: ['bracket-data', bracketId] });

          toastRef.current({
            title: 'Bracket Updated',
            description: 'Match scores have been updated.',
            duration: 3000,
          });
        }
      )
      .subscribe((status) => {
        bracketLog('Realtime subscription status:', { status, bracketId, stageId });
        if (status === 'SUBSCRIBED') {
          bracketLog('Realtime subscription to match table ACTIVE');
          setRealtimeEnabled(true);
        } else if (status === 'CHANNEL_ERROR') {
          errorLog('Realtime subscription FAILED', { bracketId, stageId });
          setRealtimeEnabled(false);
        }
      });

    return () => {
      bracketLog('Cleaning up match table realtime subscription');
      supabase.removeChannel(channel);
      setRealtimeEnabled(false);
    };
  }, [bracketId, stageId]); // Only depend on bracketId and stageId - toast/queryClient accessed via refs

  return { realtimeEnabled, lastUpdate, stageId };
}
