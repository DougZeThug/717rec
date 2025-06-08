
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from "@/types";
import { useTeamRecords } from "./useTeamRecords";
import { useQueryClient } from "@tanstack/react-query";

export const useMatchUpdates = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const handleUpdateMatch = async (matchData: Omit<Match, "id">, teams: Team[]) => {
    if (!editingMatch) return false;
    
    try {
      // Check if the winner/loser has changed
      const winnerChanged = editingMatch.winnerId !== matchData.winnerId;
      const wasCompleted = editingMatch.iscompleted;
      const isNowCompleted = matchData.iscompleted;
      
      // Update the match in Supabase
      const { data, error } = await supabase
        .from('matches')
        .update({
          team1_id: matchData.team1Id,
          team2_id: matchData.team2Id,
          date: matchData.date,
          location: matchData.location || "",
          iscompleted: matchData.iscompleted,
          team1_score: matchData.team1Score,
          team2_score: matchData.team2Score,
          winner_id: matchData.winnerId,
          loser_id: matchData.loserId,
          team1_game_wins: matchData.team1_game_wins || 0,
          team2_game_wins: matchData.team2_game_wins || 0,
          best_of: matchData.best_of,
          match_type: matchData.match_type,
          season_id: matchData.season_id
        })
        .eq('id', editingMatch.id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Transform the returned match to our app's format
      const updatedMatch: Match = {
        id: data.id,
        team1Id: data.team1_id,
        team2Id: data.team2_id,
        date: data.date,
        location: data.location,
        iscompleted: data.iscompleted,
        team1Score: data.team1_score,
        team2Score: data.team2_score,
        winnerId: data.winner_id,
        loserId: data.loser_id,
        team1_game_wins: data.team1_game_wins,
        team2_game_wins: data.team2_game_wins,
        best_of: data.best_of,
        match_type: data.match_type,
        season_id: data.season_id
      };
      
      // Update the matches state
      const updatedMatches = matches.map(match => 
        match.id === updatedMatch.id ? updatedMatch : match
      );
      setMatches(updatedMatches);
      
      setEditingMatch(undefined);
      
      toast({
        title: "Match Updated",
        description: `Match details have been successfully updated.`,
      });

      // If match is newly completed or winner changed, update team records
      if ((isNowCompleted && !wasCompleted) || (isNowCompleted && winnerChanged)) {
        if (updatedMatch.winnerId && updatedMatch.loserId) {
          await updateTeamRecords(updatedMatch.winnerId, updatedMatch.loserId, teams);
        }
      }
      
      // Invalidate relevant queries to refresh data across the app
      invalidateAllDataQueries();
      
      return true;
    } catch (error: any) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: `Failed to update match: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  };

  const handleDeleteMatch = async (teams: Team[]) => {
    if (!deleteMatchId) return false;
    
    try {
      const matchToDelete = matches.find(match => match.id === deleteMatchId);
      
      if (!matchToDelete) {
        throw new Error("Match not found");
      }
      
      // Delete the match from Supabase
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', deleteMatchId);
      
      if (error) throw error;
      
      // Update the matches state
      const updatedMatches = matches.filter(match => match.id !== deleteMatchId);
      setMatches(updatedMatches);
      
      setDeleteMatchId(null);
      
      toast({
        title: "Match Deleted",
        description: "Match has been successfully deleted.",
        variant: "destructive"
      });
      
      // Invalidate all queries to ensure data consistency
      invalidateAllDataQueries();
      
      return true;
    } catch (error: any) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error", 
        description: `Failed to delete match: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  };

  // Helper function to invalidate all related queries
  const invalidateAllDataQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    
    // Also invalidate single team queries that might be open in team details pages
    queryClient.invalidateQueries({ queryKey: ['team'] }); 
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
  };

  return {
    editingMatch,
    deleteMatchId,
    setEditingMatch,
    setDeleteMatchId,
    handleUpdateMatch,
    handleDeleteMatch,
    invalidateAllDataQueries
  };
};
