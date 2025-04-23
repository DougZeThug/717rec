
import { supabase } from "@/integrations/supabase/client";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { MatchWithTeams } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useMatchUpdates = () => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const updateMatchInDatabase = async (match: MatchWithTeams) => {
    try {
      console.log(`Updating match ${match.id} in database:`, match);
      let winnerId = null;
      let loserId = null;
      
      // Determine winner and loser based on match scores (binary 1/0 indicators)
      if (match.team1Score === 1) {
        winnerId = match.team1Id;
        loserId = match.team2Id;
      } else if (match.team2Score === 1) {
        winnerId = match.team2Id;
        loserId = match.team1Id;
      } else {
        throw new Error('Invalid match scores: exactly one team must win');
      }

      // Ensure game wins are properly parsed as integers
      const team1GameWins = parseInt(String(match.team1_game_wins)) || 0;
      const team2GameWins = parseInt(String(match.team2_game_wins)) || 0;
      
      console.log(`Match ${match.id} winner: ${winnerId}, loser: ${loserId}`);
      console.log(`Game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);

      // Set match scores as 1/0 binary indicators
      const team1Score = winnerId === match.team1Id ? 1 : 0;
      const team2Score = winnerId === match.team2Id ? 1 : 0;

      // Create the update payload, ensuring all values are explicitly set
      const updatePayload = {
        team1_score: team1Score,
        team2_score: team2Score,
        iscompleted: match.iscompleted,
        winner_id: winnerId,
        loser_id: loserId,
        team1_game_wins: team1GameWins, // Explicitly set parsed game wins
        team2_game_wins: team2GameWins  // Explicitly set parsed game wins
      };
      
      // Debug log to verify the payload before submission
      console.log(`🧪 Final Supabase update payload for match ${match.id}:`, {
        id: match.id,
        ...updatePayload
      });

      const { data, error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', match.id)
        .select();

      if (error) {
        console.error(`Error updating match ${match.id}:`, error);
        throw error;
      }
      
      // Check if no rows were updated
      if (!data || data.length === 0) {
        console.warn(`⚠️ Supabase update matched no rows. Check matchId:`, match.id);
        throw new Error(`No rows updated for match ${match.id}`);
      }
      
      console.log(`Match ${match.id} updated successfully:`, data);

      // Update team records if match is completed and we have winner/loser
      if (match.iscompleted && winnerId && loserId && match.team1 && match.team2) {
        console.log(`Updating team records for winner ${winnerId} and loser ${loserId}`);
        const teams = [match.team1, match.team2]; 
        
        // Get the actual game wins for winner and loser
        const winnerGameWins = winnerId === match.team1Id ? team1GameWins : team2GameWins;
        const loserGameWins = loserId === match.team1Id ? team1GameWins : team2GameWins;
        
        console.log('Team objects being passed:', teams);
        console.log(`Game wins - Winner: ${winnerGameWins}, Loser: ${loserGameWins}`);
        
        const updateResult = await updateTeamRecords(
          winnerId, 
          loserId, 
          teams,
          winnerGameWins,
          loserGameWins
        );
        console.log(`Team record update result: ${updateResult ? "success" : "failure"}`);
      }

      // Invalidate queries to ensure fresh data throughout the app
      const queriesToInvalidate = [
        'matches', 'teams', 'rankings', 'teamStats', 'team', 'team-matches'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        console.log(`Invalidated query cache for ${queryKey}`);
      }
      
      return true;
    } catch (error: any) {
      console.error("Error updating match:", error.message);
      return false;
    }
  };

  return { updateMatchInDatabase };
};
