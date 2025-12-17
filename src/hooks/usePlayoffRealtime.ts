
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PlayoffMatch } from '@/types';
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
          
          // Transform database match to app format
          const updatedMatch = {
            id: payload.new.id,
            round: payload.new.round,
            position: payload.new.position,
            matchType: payload.new.match_type,
            team1Id: payload.new.team1_id,
            team2Id: payload.new.team2_id,
            team1Score: payload.new.team1_score,
            team2Score: payload.new.team2_score,
            team1GameWins: payload.new.team1_game_wins,
            team2GameWins: payload.new.team2_game_wins,
            winnerId: payload.new.winner_id,
            loserId: payload.new.loser_id,
            bestOf: payload.new.best_of,
            team1Seed: payload.new.team1_seed,
            team2Seed: payload.new.team2_seed,
            nextWinMatchId: payload.new.next_win_match_id,
            nextLoseMatchId: payload.new.next_lose_match_id
          } as PlayoffMatch;
          
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
