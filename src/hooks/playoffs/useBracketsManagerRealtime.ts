import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { bracketLog } from '@/utils/logger';

/**
 * Dedicated realtime hook for brackets-manager SQL tables (match, participant)
 * Subscribes to the 'match' table which is where brackets-manager stores data
 */
export function useBracketsManagerRealtime(bracketId: string | null) {
  const queryClient = useQueryClient();

  const invalidateBracketQueries = useCallback(() => {
    // Batch invalidate all bracket-related queries
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] }),
      queryClient.invalidateQueries({ queryKey: ['brackets'] }),
      queryClient.invalidateQueries({ queryKey: ['brackets-manager-match'] }),
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] })
    ]);
  }, [queryClient, bracketId]);

  useEffect(() => {
    if (!bracketId) return;

    bracketLog('Setting up brackets-manager realtime for bracket:', bracketId);

    // First, get the stage_id for this bracket to filter match updates
    const setupSubscription = async () => {
      // Get stage ID for this bracket
      const { data: stages } = await supabase
        .from('stage')
        .select('id')
        .eq('tournament_id', bracketId);

      const stageIds = stages?.map(s => s.id) || [];
      
      if (stageIds.length === 0) {
        bracketLog('No stages found for bracket, skipping realtime setup');
        return null;
      }

      bracketLog('Found stages for realtime:', stageIds);

      // Subscribe to match table updates for this bracket's stages
      const channel = supabase
        .channel(`brackets-manager-${bracketId}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'match'
          },
          (payload) => {
            // Filter by stage_id client-side since Supabase doesn't support IN filters
            const matchStageId = (payload.new as any)?.stage_id || (payload.old as any)?.stage_id;
            
            if (stageIds.includes(matchStageId)) {
              bracketLog('Match table updated, refreshing bracket data:', {
                event: payload.eventType,
                matchId: (payload.new as any)?.id || (payload.old as any)?.id
              });
              
              // Immediately invalidate queries to trigger refetch
              invalidateBracketQueries();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'participant',
            filter: `tournament_id=eq.${bracketId}`
          },
          (payload) => {
            bracketLog('Participant table updated:', payload.eventType);
            invalidateBracketQueries();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            bracketLog('Brackets-manager realtime subscription active');
          }
        });

      return channel;
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    setupSubscription().then(ch => {
      channel = ch;
    });

    return () => {
      if (channel) {
        bracketLog('Cleaning up brackets-manager realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [bracketId, invalidateBracketQueries]);
}
