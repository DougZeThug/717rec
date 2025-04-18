
import { useToast } from "@/hooks/use-toast";
import { useTeamWinLossUpdate } from "@/hooks/team-stats/useTeamWinLossUpdate"; 
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SubmitScoreParams } from "./types/matchSubmissionTypes";
import { determineMatchResults } from "./utils/matchResultUtils";
import { updateMatchInDatabase } from "./utils/matchUpdateUtils";
import { fetchTeamsForMatch } from "./utils/teamDataUtils";
import { invalidateMatchRelatedQueries } from "./utils/queryCacheUtils";

export const useMatchSubmission = () => {
  const { toast } = useToast();
  const { updateTeamRecords } = useTeamWinLossUpdate();
  const queryClient = useQueryClient();

  const handleSubmitScore = async ({
    matchId,
    team1Score,
    team2Score,
    team1GameWins = 0,
    team2GameWins = 0
  }: SubmitScoreParams) => {
    try {
      // Fetch the match data to get team IDs
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      const { team1_id, team2_id } = matchData;
      
      console.log(`[useMatchSubmission] Match ${matchId} data:`, matchData);
      console.log(`[useMatchSubmission] Scores - Team1: ${team1Score}, Team2: ${team2Score}`);
      console.log(`[useMatchSubmission] Game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);

      // Determine match results
      const matchResult = determineMatchResults(
        team1_id, 
        team2_id, 
        team1Score, 
        team2Score,
        team1GameWins,
        team2GameWins
      );
      
      // Update the match in database
      await updateMatchInDatabase(matchId, team1Score, team2Score, matchResult);

      // If we have both winner and loser, update team records
      if (matchResult.winnerId && matchResult.loserId) {
        // Fetch team data
        const teamIds = [matchResult.winnerId, matchResult.loserId];
        const teams = await fetchTeamsForMatch(teamIds);
        
        if (teams.length === 2) {
          console.log(`[useMatchSubmission] Updating team records for winner ${matchResult.winnerId} and loser ${matchResult.loserId}`);
          
          // Get the game wins for each team
          const winnerGameWins = matchResult.winnerId === team1_id ? team1GameWins : team2GameWins;
          const loserGameWins = matchResult.loserId === team1_id ? team1GameWins : team2GameWins;
            
          const updateSuccess = await updateTeamRecords(
            matchResult.winnerId, 
            matchResult.loserId, 
            teams,
            winnerGameWins,
            loserGameWins
          );
          
          console.log(`[useMatchSubmission] Team records update ${updateSuccess ? 'succeeded' : 'failed'}`);
        }
      }

      // Invalidate relevant queries to ensure fresh data
      await invalidateMatchRelatedQueries(queryClient);
      
      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated and team records are now current.',
      });
      
      return true;
    } catch (error: any) {
      console.error('[useMatchSubmission] Error updating scores:', error);
      toast({
        title: 'Error',
        description: 'Failed to update scores. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { handleSubmitScore };
};
