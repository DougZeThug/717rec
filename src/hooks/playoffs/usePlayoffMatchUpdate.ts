import { useMemo, useCallback } from 'react';
import { bracketManagerService } from '@/services/brackets/manager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PlayoffBracket } from '@/types/playoffs';

export const usePlayoffMatchUpdate = (bracket: PlayoffBracket | null) => {
  const { toast } = useToast();
  
  // Determine which system manages this bracket
  const useBracketsManager = useMemo(() => {
    return bracket?.uses_brackets_manager === true;
  }, [bracket]);
  
  const updateMatch = useCallback(async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number
  ) => {
    
    if (useBracketsManager) {
      // ✅ NEW: Use brackets-manager.js with MANUAL loser propagation (fixes v1.7.0 bug)
      console.log('🚀 Using brackets-manager for match update with MANUAL loser propagation');
      
      await bracketManagerService.updateMatchWithLoserPropagation({
        matchId: parseInt(matchId),
        scores: {
          opponent1: { 
            score: team1GameWins,
            ...(team1GameWins > team2GameWins ? { result: "win" as const } : {})
          },
          opponent2: { 
            score: team2GameWins,
            ...(team2GameWins > team1GameWins ? { result: "win" as const } : {})
          }
        }
      });
      
      // Save individual games
      if (games && games.length > 0) {
        const { data: matchData } = await supabase
          .from('playoff_matches')
          .select('team1_id, team2_id')
          .eq('id', matchId)
          .single();

        if (matchData) {
          await supabase
            .from('playoff_games')
            .delete()
            .eq('match_id', matchId);

          const gameInserts = games.map((game, index) => {
            const gameWinnerId = game.team1Score > game.team2Score 
              ? matchData.team1_id 
              : matchData.team2_id;
            
            return {
              match_id: matchId,
              game_number: index + 1,
              team1_score: game.team1Score,
              team2_score: game.team2Score,
              winner_id: gameWinnerId
            };
          });

          await supabase
            .from('playoff_games')
            .insert(gameInserts);
        }
      }
      
      toast({
        title: "Success",
        description: "Match updated with automatic winner progression",
      });
      
    } else {
      // ✅ LEGACY: Direct Supabase update (no auto-progression)
      console.log('📊 Using legacy direct update (no auto-progression)');
      
      const { data: matchData, error: fetchError } = await supabase
        .from('playoff_matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (fetchError || !matchData) {
        throw new Error('Failed to fetch match data');
      }

      const winnerId = team1GameWins > team2GameWins ? matchData.team1_id : matchData.team2_id;
      const loserId = team1GameWins > team2GameWins ? matchData.team2_id : matchData.team1_id;

      await supabase
        .from('playoff_matches')
        .update({
          team1_score: team1Score,
          team2_score: team2Score,
          winner_id: winnerId,
          loser_id: loserId,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', matchId);

      // Save games
      if (games && games.length > 0) {
        await supabase
          .from('playoff_games')
          .delete()
          .eq('match_id', matchId);

        const gameInserts = games.map((game, index) => {
          const gameWinnerId = game.team1Score > game.team2Score 
            ? matchData.team1_id 
            : matchData.team2_id;
          
          return {
            match_id: matchId,
            game_number: index + 1,
            team1_score: game.team1Score,
            team2_score: game.team2Score,
            winner_id: gameWinnerId
          };
        });

        await supabase
          .from('playoff_games')
          .insert(gameInserts);
      }
      
      toast({
        title: "Success", 
        description: "Match score saved successfully",
      });
    }
    
  }, [useBracketsManager, toast]);
  
  return { updateMatch, useBracketsManager };
};
