
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeamWinLossUpdate } from "@/hooks/team-stats/useTeamWinLossUpdate"; 
import { useQueryClient } from "@tanstack/react-query";
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
      
      // Determine match results based on match scores (1/0), not game wins
      // Match win is determined by comparing the total scores (team1Score vs team2Score)
      const team1Win = team1Score > team2Score;
      
      console.log('Submitting match:', {
        matchId,
        team1GameWins: team1GameWinsNum,
        team2GameWins: team2GameWinsNum,
        team1_score: team1Win ? 1 : 0,
        team2_score: team1Win ? 0 : 1,
        winner_id: team1Win ? team1_id : team2_id
      });

      // Update the match in database with both match-level and game-level stats
      const updatePayload = {
        team1_score: team1Win ? 1 : 0,  // Binary match win indicator
        team2_score: team1Win ? 0 : 1,  // Binary match win indicator
        team1_game_wins: team1GameWinsNum, // Actual game wins
        team2_game_wins: team2GameWinsNum, // Actual game wins
        iscompleted: true,
        winner_id: team1Win ? team1_id : team2_id,
        loser_id: team1Win ? team2_id : team1_id
      };

      const { data, error } = await supabase
        .from('matches')
        .update(updatePayload)
        .eq('id', matchId)
        .select();

      if (error) throw error;
      
      // Trigger team records update
      const teamsUpdateSuccess = await updateTeamRecords(
        team1Win ? team1_id : team2_id, 
        team1Win ? team2_id : team1_id, 
        [], 
        team1Win ? team1GameWinsNum : team2GameWinsNum,
        team1Win ? team2GameWinsNum : team1GameWinsNum
      );

      if (!teamsUpdateSuccess) {
        console.warn('Team records update partially failed');
        toast({
          title: 'Partial Update',
          description: 'Match scores updated, but team records may not be fully synchronized.',
          variant: 'default'
        });
      }

      // Invalidate all relevant query caches to ensure data freshness
      await invalidateMatchRelatedQueries(queryClient);
      
      // Explicitly invalidate teams and standings queries using correct syntax
      queryClient.invalidateQueries({ 
        predicate: q => ['teams', 'team', 'rankings'].includes(String(q.queryKey[0]))
      });
      console.debug('[invalidate] done');
      
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
