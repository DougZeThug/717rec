
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Match, Team } from "@/types";
import { useTeamRecords } from "./useTeamRecords";

export const useMatchCreation = (matches: Match[], setMatches: (matches: Match[]) => void) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();

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
          team1_game_wins: matchData.team1_game_wins || 0,
          team2_game_wins: matchData.team2_game_wins || 0,
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
        team1_game_wins: data.team1_game_wins,
        team2_game_wins: data.team2_game_wins,
        round_number: data.round_number
      };
      
      setMatches([...matches, newMatch]);
      setIsFormOpen(false);
      
      toast({
        title: "Match Created",
        description: `Match has been successfully scheduled.`,
      });

      // If match is completed with a winner/loser, update team records
      if (newMatch.iscompleted && newMatch.winnerId && newMatch.loserId) {
        const winnerGameWins = newMatch.winnerId === newMatch.team1Id ? (newMatch.team1_game_wins || 0) : (newMatch.team2_game_wins || 0);
        const loserGameWins = newMatch.loserId === newMatch.team1Id ? (newMatch.team1_game_wins || 0) : (newMatch.team2_game_wins || 0);
        
        await updateTeamRecords(
          newMatch.winnerId, 
          newMatch.loserId, 
          teams,
          winnerGameWins,
          loserGameWins
        );
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

  return {
    isFormOpen,
    setIsFormOpen,
    handleCreateMatch
  };
};
