
import { useState } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMatchRelatedQueries } from "@/hooks/matches/utils/queryCacheUtils";
import type { PlayoffGame } from "@/types/playoffs";

export const usePlayoffActions = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Handle bracket deletion
  const deleteBracket = async (
    bracketId: string, 
    bracketName: string
  ) => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      await supabase
        .from('brackets')
        .delete()
        .eq('id', bracketId);
      
      toast({
        title: "Bracket Deleted",
        description: `"${bracketName}" has been successfully deleted.`,
      });
      
      // Invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
      await invalidateMatchRelatedQueries(queryClient);
      
    } catch (error) {
      console.error("Error deleting bracket:", error);
      toast({
        title: "Error",
        description: "Failed to delete bracket. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle updating match results
  const updateMatchResult = async (
    matchId: string, 
    winnerId: string, 
    team1Score: number, 
    team2Score: number,
    team1GameWins?: number,
    team2GameWins?: number,
    games?: PlayoffGame[]
  ) => {
    try {
      // Update in playoff_matches table
      const { error: matchError } = await supabase
        .from('playoff_matches')
        .update({
          winner_id: winnerId,
          team1_score: team1Score,
          team2_score: team2Score,
          status: 'completed'
        })
        .eq('id', matchId);
      
      if (matchError) throw matchError;
      
      // Update games if provided
      if (games && games.length > 0) {
        for (const game of games) {
          if (game.id) {
            await supabase
              .from('playoff_games')
              .upsert({
                id: game.id,
                match_id: matchId,
                game_number: game.gameNumber || 1,
                team1_score: game.team1Score,
                team2_score: game.team2Score,
                winner_id: game.winnerId
              });
          }
        }
      }
      
      // Invalidate queries to refetch data
      await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
      await queryClient.invalidateQueries({ queryKey: ['bracket'] });
      
      toast({
        title: "Match Updated",
        description: "Match score has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return {
    deleteBracket,
    updateMatchResult,
    isDeleting
  };
};
