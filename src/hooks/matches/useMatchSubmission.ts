import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import { errorLog, matchLog } from '@/utils/logger';

import { SubmitScoreParams } from './types/matchSubmissionTypes';
import { useTeamRecordUpdate } from './useTeamRecordUpdate';
import { updateMatchScore } from './utils/matchDatabaseUtils';
import { invalidateMatchRelatedQueries } from './utils/queryCacheUtils';
import { useScoreValidation } from './validation/useScoreValidation';

export const useMatchSubmission = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { updateTeamStats } = useTeamRecordUpdate();
  const { validateScore } = useScoreValidation();

  const handleSubmitScore = async ({
    matchId,
    team1Score,
    team2Score,
    team1GameWins = 0,
    team2GameWins = 0,
  }: SubmitScoreParams) => {
    try {
      // Ensure game wins are properly parsed as integers
      const parsedTeam1GameWins = parseInt(String(team1GameWins)) || 0;
      const parsedTeam2GameWins = parseInt(String(team2GameWins)) || 0;

      matchLog('handleSubmitScore received game wins:', {
        team1GameWins: parsedTeam1GameWins,
        team2GameWins: parsedTeam2GameWins,
      });

      // Validate scores before database operations
      const validation = validateScore(team1Score, team2Score);
      if (!validation.isValid) {
        toast({
          title: 'Validation Error',
          description: validation.errorMessage,
          variant: 'destructive',
        });
        return false;
      }

      // Update match score and get result details
      const { data, team1_id, team2_id, team1Win } = await updateMatchScore({
        matchId,
        team1Score,
        team2Score,
        team1GameWins: parsedTeam1GameWins,
        team2GameWins: parsedTeam2GameWins,
      });

      // Update team records if match is completed
      await updateTeamStats(
        team1Win ? team1_id : team2_id,
        team1Win ? team2_id : team1_id,
        data,
        team1Win ? parsedTeam1GameWins : parsedTeam2GameWins,
        team1Win ? parsedTeam2GameWins : parsedTeam1GameWins
      );

      // Invalidate all relevant query caches
      await invalidateMatchRelatedQueries(queryClient);

      toast({
        title: 'Scores Updated',
        description: 'Match scores have been successfully updated.',
      });

      return true;
    } catch (error) {
      errorLog('[useMatchSubmission] Error updating scores:', error);
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
