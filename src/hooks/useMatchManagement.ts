
import { useState } from "react";
import { Match, Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useMatchManagement = (initialMatches: Match[]) => {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [editingMatch, setEditingMatch] = useState<Match | undefined>(undefined);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const getTeamName = (teams: Team[], teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : "Unknown Team";
  };

  const updateTeamRecords = async (winnerId: string, loserId: string, teams: Team[]) => {
    try {
      // Get the current records for both teams
      const { data: winnerData, error: winnerError } = await supabase
        .from('teams')
        .select('wins')
        .eq('id', winnerId)
        .single();
      
      if (winnerError) throw winnerError;
      
      const { data: loserData, error: loserError } = await supabase
        .from('teams')
        .select('losses')
        .eq('id', loserId)
        .single();
      
      if (loserError) throw loserError;
      
      // Update winner's record
      const { error: updateWinnerError } = await supabase
        .from('teams')
        .update({ wins: (winnerData.wins || 0) + 1 })
        .eq('id', winnerId);
      
      if (updateWinnerError) throw updateWinnerError;
      
      // Update loser's record
      const { error: updateLoserError } = await supabase
        .from('teams')
        .update({ losses: (loserData.losses || 0) + 1 })
        .eq('id', loserId);
      
      if (updateLoserError) throw updateLoserError;
      
      const winnerName = getTeamName(teams, winnerId);
      const loserName = getTeamName(teams, loserId);
      
      toast({
        title: "Team Records Updated",
        description: `${winnerName} (W) and ${loserName} (L) records have been updated.`,
      });
      
      return true;
    } catch (error) {
      console.error("Error updating team records:", error);
      toast({
        title: "Error",
        description: "Failed to update team records. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleCreateMatch = async (matchData: Omit<Match, "id">, teams: Team[]) => {
    try {
      // Create the match in Supabase
      const { data, error } = await supabase
        .from('matches')
        .insert({
          team1_id: matchData.team1Id,
          team2_id: matchData.team2Id,
          date: matchData.date,
          location: matchData.location || "",
          iscompleted: matchData.iscompleted,
          team1_score: matchData.team1Score,
          team2_score: matchData.team2Score,
          winner_id: matchData.winnerId,
          loser_id: matchData.loserId,
          round_number: 0 // Adding required field with default value
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Transform the returned match to our app's format
      const newMatch: Match = {
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
        round_number: data.round_number
      };
      
      setMatches([...matches, newMatch]);
      setIsFormOpen(false);
      
      toast({
        title: "Match Created",
        description: `Match between ${getTeamName(teams, newMatch.team1Id)} and ${getTeamName(teams, newMatch.team2Id)} has been scheduled.`,
      });

      // If match is completed with a winner/loser, update team records
      if (newMatch.iscompleted && newMatch.winnerId && newMatch.loserId) {
        await updateTeamRecords(newMatch.winnerId, newMatch.loserId, teams);
        toast({
          title: "Standings Updated",
          description: "Team standings and power scores have been recalculated.",
        });
      }
      
      return true;
    } catch (error: any) {
      console.error("Error creating match:", error);
      toast({
        title: "Error",
        description: `Failed to create match: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  };

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
          loser_id: matchData.loserId
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
        round_number: data.round_number
      };
      
      // Update the matches state
      setMatches(prevMatches => prevMatches.map(match => 
        match.id === updatedMatch.id ? updatedMatch : match
      ));
      
      setEditingMatch(undefined);
      
      toast({
        title: "Match Updated",
        description: `Match details have been successfully updated.`,
      });

      // If match is newly completed or winner changed, update team records
      if ((isNowCompleted && !wasCompleted) || (isNowCompleted && winnerChanged)) {
        if (updatedMatch.winnerId && updatedMatch.loserId) {
          await updateTeamRecords(updatedMatch.winnerId, updatedMatch.loserId, teams);
          toast({
            title: "Standings Updated",
            description: "Team standings and power scores have been recalculated.",
          });
        }
      }
      
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
        description: `Match between ${getTeamName(teams, matchToDelete.team1Id)} and ${getTeamName(teams, matchToDelete.team2Id)} has been deleted.`,
        variant: "destructive"
      });
      
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

  return {
    matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch
  };
};
