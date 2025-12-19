import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { bracketManagerService } from '@/services/brackets/manager';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';
import { scoreLog } from '@/utils/logger';
import { invalidateMatchRelatedQueries } from '@/hooks/matches/utils/queryCacheUtils';

export const usePlayoffMatchUpdate = (bracket: PlayoffBracket | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
      // ✅ Use brackets-manager.js for match updates (handles loser propagation automatically)
      scoreLog('usePlayoffMatchUpdate - START: Using brackets-manager', {
        matchId,
        team1GameWins,
        team2GameWins,
        winnerId: team1GameWins > team2GameWins ? 'team1' : 'team2'
      });
      
      // For brackets-manager, fetch from the 'match' table (not playoff_matches)
      const numericMatchId = parseInt(matchId);
      const { data: bmMatchData, error: bmMatchError } = await supabase
        .from('match')
        .select('opponent1_id, opponent2_id, stage_id')
        .eq('id', numericMatchId)
        .single();
      
      if (bmMatchError || !bmMatchData) {
        scoreLog('Failed to fetch brackets-manager match data', { matchId, error: bmMatchError });
        throw new Error('Failed to fetch match data from brackets-manager table');
      }

      // Get participant data to map opponent IDs to team IDs
      const opponentIds = [bmMatchData.opponent1_id, bmMatchData.opponent2_id].filter(Boolean);
      const { data: participants } = await supabase
        .from('participant')
        .select('id, name, tournament_id')
        .in('id', opponentIds);

      // Map opponent IDs to team names for logging (actual team lookup not needed for brackets-manager update)
      const opponent1Name = participants?.find(p => p.id === bmMatchData.opponent1_id)?.name || 'Unknown';
      const opponent2Name = participants?.find(p => p.id === bmMatchData.opponent2_id)?.name || 'Unknown';
      
      scoreLog('Brackets-manager match participants', { 
        opponent1: { id: bmMatchData.opponent1_id, name: opponent1Name },
        opponent2: { id: bmMatchData.opponent2_id, name: opponent2Name }
      });

      // Handle BYE matches (one opponent is null) as forfeits
      const isBye = !bmMatchData.opponent1_id || !bmMatchData.opponent2_id;
      if (isBye) {
        scoreLog("BYE match detected - treating as forfeit");
      }
      
      // For brackets-manager, we use opponent IDs directly (not team UUIDs)
      const winnerOpponentId = team1GameWins > team2GameWins ? bmMatchData.opponent1_id : bmMatchData.opponent2_id;
      
      scoreLog(`Calling bracketManagerService.updateMatch for Match ${matchId}`, {
        matchId: parseInt(matchId),
        scores: {
          opponent1: { score: team1GameWins, result: team1GameWins > team2GameWins ? "win" : "loss" },
          opponent2: { score: team2GameWins, result: team2GameWins > team1GameWins ? "win" : "loss" }
        }
      });
      
      await bracketManagerService.updateMatch({
        matchId: parseInt(matchId),
        scores: {
          opponent1: { 
            score: team1GameWins,
            result: team1GameWins > team2GameWins ? "win" as const : "loss" as const
          },
          opponent2: { 
            score: team2GameWins,
            result: team2GameWins > team1GameWins ? "win" as const : "loss" as const
          }
        }
      });
      
      scoreLog(`usePlayoffMatchUpdate - COMPLETED: Match ${matchId}`);
      
      // For brackets-manager, game-level data is handled by the library via match_game table
      // Skip legacy playoff_games table operations
      scoreLog('Brackets-manager match - game data handled internally');
      
      // Invalidate all match-related queries to ensure fresh data
      await invalidateMatchRelatedQueries(queryClient);
      
      // Explicitly invalidate this specific bracket's data and force refetch
      if (bracket?.id) {
        scoreLog('Explicitly invalidating bracket cache:', bracket.id);
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracket.id] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracket.id] });
        
        // Force immediate refetch to ensure UI updates
        await queryClient.refetchQueries({ queryKey: ['bracket-data', bracket.id] });
        scoreLog('Bracket cache invalidated and refetched');
      }
      
      toast({
        title: "Success",
        description: "Match updated with automatic winner progression",
      });
      
    } else {
      // ✅ LEGACY: Direct Supabase update (no auto-progression)
      scoreLog('Using legacy direct update (no auto-progression)');
      
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
      
      // Invalidate all match-related queries to ensure fresh data
      await invalidateMatchRelatedQueries(queryClient);
      
      toast({
        title: "Success", 
        description: "Match score saved successfully",
      });
    }
    
  }, [useBracketsManager, toast, queryClient, bracket]);
  
  return { updateMatch, useBracketsManager };
};
