
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffMatch } from "@/types/playoffs";

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);

  const handleEditMatch = useCallback(async (matchId: string, quickEdit: boolean = false) => {
    console.log('🎯 handleEditMatch called with:', { matchId, quickEdit });

    try {
      const { data, error } = await supabase
        .from('playoff_matches')
        .select(`
          *,
          playoff_games(*),
          team1:teams!fk_playoff_matches_team1(id, name, logo_url, image_url),
          team2:teams!fk_playoff_matches_team2(id, name, logo_url, image_url)
        `)
        .eq('id', matchId)
        .single();

      if (error) {
        console.error('🎯 Error fetching playoff match:', error);
        throw error;
      }

      if (data) {
        const games = (data.playoff_games || []).map((game: any) => ({
          id: game.id,
          matchId: game.match_id,
          gameNumber: game.game_number,
          team1Score: game.team1_score,
          team2Score: game.team2_score,
          winnerId: game.winner_id,
          winner: game.winner_id
        }));

        const team1GameWins = games.filter(g => g.winnerId === data.team1_id).length;
        const team2GameWins = games.filter(g => g.winnerId === data.team2_id).length;

        const transformedMatch: PlayoffMatch = {
          id: data.id,
          round: data.round,
          position: data.position,
          team1Id: data.team1_id,
          team2Id: data.team2_id,
          winnerId: data.winner_id,
          loserId: data.loser_id,
          team1Score: data.team1_score,
          team2Score: data.team2_score,
          team1GameWins,
          team2GameWins,
          matchType: data.match_type,
          bestOf: data.best_of || 3,
          games,
          team1Seed: data.team1_seed,
          team2Seed: data.team2_seed,
          nextWinMatchId: data.next_win_match_id,
          nextLoseMatchId: data.next_lose_match_id,
          bracket_id: data.bracket_id,
          status: data.status || 'pending'
        };

        setEditingMatch(transformedMatch);
        setIsQuickEdit(quickEdit);
      }
    } catch (err) {
      console.error('🎯 Error in handleEditMatch:', err);
    }
  }, []);

  const handleCloseMatchEditor = useCallback(() => {
    console.log('🎯 handleCloseMatchEditor called');
    setEditingMatch(null);
    setIsQuickEdit(false);
  }, []);

  const handleSaveMatchScore = useCallback(async (
    matchId: string,
    team1Score: number,
    team2Score: number,
    games: { team1Score: number; team2Score: number }[],
    team1GameWins: number,
    team2GameWins: number,
    refetchBrackets: () => Promise<any>
  ) => {
    console.log('🎯 handleSaveMatchScore called with all 7 parameters:', {
      matchId,
      team1Score,
      team2Score,
      games,
      team1GameWins,
      team2GameWins,
      refetchBrackets: typeof refetchBrackets
    });

    try {
      // Determine winner and loser based on game wins
      const winnerId = team1GameWins > team2GameWins ? 'team1' : 'team2';
      const loserId = team1GameWins > team2GameWins ? 'team2' : 'team1';

      // Update the playoff match
      const { error: matchError } = await supabase
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

      if (matchError) {
        console.error('🎯 Error updating playoff match:', matchError);
        throw matchError;
      }

      // Save individual games if provided
      if (games && games.length > 0) {
        // Delete existing games first
        await supabase
          .from('playoff_games')
          .delete()
          .eq('match_id', matchId);

        // Insert new games
        const gameInserts = games.map((game, index) => ({
          match_id: matchId,
          game_number: index + 1,
          team1_score: game.team1Score,
          team2_score: game.team2Score,
          winner_id: game.team1Score > game.team2Score ? 'team1' : 'team2'
        }));

        const { error: gamesError } = await supabase
          .from('playoff_games')
          .insert(gameInserts);

        if (gamesError) {
          console.error('🎯 Error saving playoff games:', gamesError);
          throw gamesError;
        }
      }

      console.log('🎯 Match score saved successfully');
      
      // Call the refetch function to update the UI
      if (refetchBrackets) {
        await refetchBrackets();
      }

      // Close the editor after saving
      handleCloseMatchEditor();

    } catch (error) {
      console.error('🎯 Error in handleSaveMatchScore:', error);
      throw error;
    }
  }, [handleCloseMatchEditor]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};
