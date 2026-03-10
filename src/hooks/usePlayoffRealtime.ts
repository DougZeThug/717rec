import { useEffect, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { PlayoffMatch } from '@/types';
import { playoffLog } from '@/utils/logger';
import { transformRealtimePlayoffMatch } from '@/utils/matchTransformers';

export function usePlayoffRealtime(bracketId: string | null) {
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [lastUpdatedMatch, setLastUpdatedMatch] = useState<PlayoffMatch | null>(null);
  const { toast } = useToast();

  // Use ref to hold toast function to prevent subscription recreation
  const toastRef = useRef(toast);

  // Update ref when toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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
          filter: `bracket_id=eq.${bracketId}`,
        },
        (payload) => {
          playoffLog('Match updated:', payload.new.id);

          // Transform database match to app format using centralized transformer
          const updatedMatch = transformRealtimePlayoffMatch(payload.new);

          setLastUpdatedMatch(updatedMatch);

          // Show toast notification using ref to prevent subscription recreation
          toastRef.current({
            title: 'Match Updated',
            description: `Match #${updatedMatch.position} in round ${updatedMatch.round} has been updated.`,
            duration: 3000,
          });
        }
      )
      .subscribe((status) => {
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
  }, [bracketId]); // Only depend on bracketId - toast is accessed via ref

  return {
    realtimeEnabled,
    lastUpdatedMatch,
  };
}
