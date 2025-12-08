
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { bracketLog } from '@/utils/logger';

/**
 * Realtime hook for brackets-manager brackets.
 * Subscribes to the `match` table (used by brackets-manager SQL storage)
 * instead of the legacy `playoff_matches` table.
 */
export function useBracketsManagerRealtime(bracketId: string | null, stageId: number | null) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bracketId || !stageId) {
      bracketLog('useBracketsManagerRealtime: Missing bracketId or stageId', { bracketId, stageId });
      return;
    }
    
    bracketLog('Setting up realtime subscription for match table', { bracketId, stageId });
    
    const channel = supabase
      .channel(`bracket-matches-${bracketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'match',
          filter: `stage_id=eq.${stageId}`
        },
        (payload) => {
          bracketLog('Match table updated:', payload);
          setLastUpdate(new Date());
          
          // Immediately invalidate the cache to force refetch
          queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
          
          toast({
            title: "Bracket Updated",
            description: "Match scores have been updated.",
            duration: 3000
          });
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          bracketLog('Realtime subscription to match table active');
          setRealtimeEnabled(true);
        }
      });

    return () => {
      bracketLog('Cleaning up match table realtime subscription');
      supabase.removeChannel(channel);
      setRealtimeEnabled(false);
    };
  }, [bracketId, stageId, queryClient, toast]);

  return { realtimeEnabled, lastUpdate };
}
