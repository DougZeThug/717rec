
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlayoffMatch } from "@/types/playoffs";

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);

  const handleEditMatch = useCallback((matchId: string, quickEdit: boolean = false) => {
    console.log('🎯 handleEditMatch called with:', { matchId, quickEdit });
    // TODO: Implement match editing functionality
    setIsQuickEdit(quickEdit);
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
      // First, fetch the match to get the actual team IDs
      const { data: matchData, error: fetchError } = await supabase
        .from('playoff_matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (fetchError) {
        console.error('🎯 Error fetching match data:', fetchError);
        throw fetchError;
      }

      if (!matchData || !matchData.team1_id || !matchData.team2_id) {
        throw new Error('Match data incomplete - missing team IDs');
      }

      // Determine winner and loser based on game wins using actual team IDs
      const winnerId = team1GameWins > team2GameWins ? matchData.team1_id : matchData.team2_id;
      const loserId = team1GameWins > team2GameWins ? matchData.team2_id : matchData.team1_id;

      console.log('🎯 Calculated winner/loser IDs:', {
        team1_id: matchData.team1_id,
        team2_id: matchData.team2_id,
        team1GameWins,
        team2GameWins,
        winnerId,
        loserId
      });

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

        // Insert new games with correct winner IDs
        const gameInserts = games.map((game, index) => {
          const gameWinnerId = game.team1Score > game.team2Score ? matchData.team1_id : matchData.team2_id;
          
          return {
            match_id: matchId,
            game_number: index + 1,
            team1_score: game.team1Score,
            team2_score: game.team2Score,
            winner_id: gameWinnerId
          };
        });

        const { error: gamesError } = await supabase
          .from('playoff_games')
          .insert(gameInserts);

        if (gamesError) {
          console.error('🎯 Error saving playoff games:', gamesError);
          throw gamesError;
        }
      }

      console.log('🎯 Match score saved successfully with correct team IDs');
      
      // Call the refetch function to update the UI
      if (refetchBrackets) {
        await refetchBrackets();
      }

    } catch (error) {
      console.error('🎯 Error in handleSaveMatchScore:', error);
      throw error;
    }
  }, []);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};
