import { supabase } from "@/integrations/supabase/client";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { MatchWithTeams } from "../types";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { scoreLog, errorLog, warnLog, dbLog } from "@/utils/logger";

export const useMatchUpdates = () => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamRecords();
  const queryClient = useQueryClient();

  const updateMatchInDatabase = async (match: MatchWithTeams) => {
    try {
      scoreLog(`Updating match ${match.id} in database`, match);
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
      const team1GameWins = Number.isInteger(match.team1_game_wins) ? 
          match.team1_game_wins : 
          parseInt(String(match.team1_game_wins)) || 0;
      const team2GameWins = Number.isInteger(match.team2_game_wins) ? 
          match.team2_game_wins : 
          parseInt(String(match.team2_game_wins)) || 0;
      
      scoreLog(`Match ${match.id} winner: ${winnerId}, loser: ${loserId}`);
      scoreLog(`Game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);

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
      scoreLog(`Final Supabase update payload for match ${match.id}`, {
        id: match.id,
        ...updatePayload,
        team1_game_wins_type: typeof updatePayload.team1_game_wins,
        team2_game_wins_type: typeof updatePayload.team2_game_wins
      });

      // Warning if submitting a match with zero game wins
      if (updatePayload.team1_game_wins === 0 && updatePayload.team2_game_wins === 0) {
        warnLog("Submitting match with 0-0 game wins. This may be incorrect.");
      }

      const { data, error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', match.id)
        .select();

      if (error) {
        errorLog(`Error updating match ${match.id}:`, error);
        throw error;
      }
      
      // Check if no rows were updated
      if (!data || data.length === 0) {
        warnLog(`Supabase update returned 0 rows affected — possible match ID mismatch: ${match.id}`);
        throw new Error(`No rows updated for match ${match.id}`);
      }
      
      scoreLog(`Match ${match.id} updated successfully`, data);

      // Update team records if match is completed and we have winner/loser
      if (match.iscompleted && winnerId && loserId && match.team1 && match.team2) {
        scoreLog(`Updating team records for winner ${winnerId} and loser ${loserId}`);
        const teams = [match.team1, match.team2]; 
        
        // Get the actual game wins for winner and loser
        const winnerGameWins = winnerId === match.team1Id ? team1GameWins : team2GameWins;
        const loserGameWins = loserId === match.team1Id ? team1GameWins : team2GameWins;
        
        scoreLog('Team objects being passed', teams);
        scoreLog(`Game wins - Winner: ${winnerGameWins}, Loser: ${loserGameWins}`);
        
        const updateResult = await updateTeamRecords(
          winnerId, 
          loserId, 
          teams,
          winnerGameWins,
          loserGameWins
        );
        scoreLog(`Team record update result: ${updateResult ? "success" : "failure"}`);
      }

      // Refresh team_season_stats to keep historical data in sync
      const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
      if (seasonStatsError) {
        warnLog('Failed to refresh season stats:', seasonStatsError);
        // Non-fatal - the view-based stats are still correct
      }

      // Invalidate queries to ensure fresh data throughout the app
      const queriesToInvalidate = [
        'matches', 'teams', 'rankings', 'teamStats', 'team', 'team-matches',
        'seasonStats', 'historicalSeasons', 'careerPowerScores'
      ];
      
      for (const queryKey of queriesToInvalidate) {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
        dbLog(`Invalidated query cache for ${queryKey}`);
      }
      
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog("Error updating match:", errorMessage);
      return false;
    }
  };

  return { updateMatchInDatabase };
};
