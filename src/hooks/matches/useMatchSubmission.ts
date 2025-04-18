
import { useToast } from "@/hooks/use-toast";
import { useTeamWinLossUpdate } from "@/hooks/team-stats/useTeamWinLossUpdate"; 
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SubmitScoreParams } from "./types/matchSubmissionTypes";
import { determineMatchResults } from "./utils/matchResultUtils";
import { updateMatchInDatabase } from "./utils/matchUpdateUtils";
import { fetchTeamsForMatch } from "./utils/teamDataUtils";

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
      
      console.log(`[useMatchSubmission] Submitting scores for match ${matchId}`);
      console.log(`Team scores - Team1: ${team1Score}, Team2: ${team2Score}`);
      console.log(`Game wins - Team1: ${team1GameWins}, Team2: ${team2GameWins}`);

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

      // If we have both winner and loser, trigger team stats update
      if (matchResult.winnerId && matchResult.loserId) {
        const teamIds = [matchResult.winnerId, matchResult.loserId];
        const teams = await fetchTeamsForMatch(teamIds);
        
        if (teams.length === 2) {
          console.log(`[useMatchSubmission] Updating team records for teams ${teamIds.join(', ')}`);
          
          // Get the game wins for each team (winner vs loser)
          const winnerGameWins = matchResult.winnerId === team1_id ? team1GameWins : team2GameWins;
          const loserGameWins = matchResult.loserId === team1_id ? team1GameWins : team2GameWins;
          
          await updateTeamRecords(
            matchResult.winnerId, 
            matchResult.loserId, 
            teams,
            winnerGameWins,
            loserGameWins
          );
        }
      }
      
      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated.',
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
