

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { PlayoffMatch } from "@/types/playoffs";

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();

  const handleEditMatch = useCallback(async (matchId: string, quickEdit: boolean = false) => {
    console.log('🎯 handleEditMatch called with:', { matchId, quickEdit });
    
    try {
      // Fetch the match data from the database
      const { data: matchData, error } = await supabase
        .from('playoff_matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) {
        console.error('🎯 Error fetching match:', error);
        toast({
          title: "Error",
          description: "Failed to load match data. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (!matchData) {
        console.error('🎯 No match found with ID:', matchId);
        toast({
          title: "Error", 
          description: "Match not found.",
          variant: "destructive",
        });
        return;
      }

      // Convert database match to PlayoffMatch format
      const playoffMatch: PlayoffMatch = {
        id: matchData.id,
        bracket_id: matchData.bracket_id,
        round: matchData.round,
        position: matchData.position,
        team1Id: matchData.team1_id,
        team2Id: matchData.team2_id,
        winnerId: matchData.winner_id,
        loserId: matchData.loser_id,
        team1Score: matchData.team1_score,
        team2Score: matchData.team2_score,
        team1GameWins: null, // These fields don't exist in playoff_matches table
        team2GameWins: null, // Will be populated from playoff_games if needed
        matchType: matchData.match_type,
        bestOf: matchData.best_of || 3,
        team1Seed: matchData.team1_seed,
        team2Seed: matchData.team2_seed,
        nextWinMatchId: matchData.next_win_match_id,
        nextLoseMatchId: matchData.next_lose_match_id,
        status: (matchData.status as "pending" | "in_progress" | "completed") || 'pending',
      };

      console.log('🎯 Successfully fetched match data:', playoffMatch);
      
      // Set the editing state
      setEditingMatch(playoffMatch);
      setIsQuickEdit(quickEdit);
      
    } catch (error) {
      console.error('🎯 Unexpected error in handleEditMatch:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

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

      // Close the editor after successful save
      setEditingMatch(null);
      setIsQuickEdit(false);

      // Show success toast
      toast({
        title: "Success",
        description: "Match score saved successfully.",
      });

    } catch (error) {
      console.error('🎯 Error in handleSaveMatchScore:', error);
      toast({
        title: "Error",
        description: "Failed to save match score. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore
  };
};

