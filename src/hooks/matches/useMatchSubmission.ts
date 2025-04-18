
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
      // Ensure scores are treated as numbers
      const team1ScoreNum = Number(team1Score);
      const team2ScoreNum = Number(team2Score);
      const team1GameWinsNum = Number(team1GameWins || 0);
      const team2GameWinsNum = Number(team2GameWins || 0);
      
      // Fetch the match data to get team IDs
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
        
      if (matchError) throw matchError;
      
      const { team1_id, team2_id } = matchData;
      
      console.log(`[useMatchSubmission] Submitting scores for match ${matchId}`);
      console.log(`Team scores - Team1: ${team1ScoreNum}, Team2: ${team2ScoreNum}`);
      console.log(`Game wins - Team1: ${team1GameWinsNum}, Team2: ${team2GameWinsNum}`);

      // Determine match results
      const matchResult = determineMatchResults(
        team1_id, 
        team2_id, 
        team1ScoreNum, 
        team2ScoreNum,
        team1GameWinsNum,
        team2GameWinsNum
      );
      
      // Update the match in database
      await updateMatchInDatabase(matchId, team1ScoreNum, team2ScoreNum, matchResult);

      // Invalidate all relevant query caches to ensure data freshness
      await invalidateMatchRelatedQueries(queryClient);
      
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
