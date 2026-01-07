import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlayoffMatch } from '@/types';
import { transformRealtimePlayoffMatch } from '@/utils/matchTransformers';
import { playoffLog } from '@/utils/logger';

export function usePlayoffRealtime(bracketId: string | null) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastUpdatedMatch, setLastUpdatedMatch] = useState<PlayoffMatch | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!bracketId) return;
    
    // Establish realtime subscription for playoff matches
    const channel = supabase
      .channel('playoff-bracket-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'playoff_matches',
          filter: `bracket_id=eq.${bracketId}`
        },
        (payload) => {
          playoffLog('Match updated:', payload.new.id);
          
          // Transform database match to app format using centralized transformer
          const updatedMatch = transformRealtimePlayoffMatch(payload.new);
          
          setLastUpdatedMatch(updatedMatch);
          
          // Show toast notification
          toast({
            title: "Match Updated",
            description: `Match #${updatedMatch.position} in round ${updatedMatch.round} has been updated.`,
            duration: 3000
          });
        }
      )
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          playoffLog('Realtime subscription active for bracket:', bracketId);
          setRealtimeEnabled(true);
        }
      });

    // Clean up subscription on unmount
    return () => {
      playoffLog('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
      setRealtimeEnabled(false);
    };
  }, [bracketId, toast]);

  return {
    realtimeEnabled,
    lastUpdatedMatch
  };
}
