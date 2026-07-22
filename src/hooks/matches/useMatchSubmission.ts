import { useQueryClient } from '@tanstack/react-query';

import { useLazyRef } from '@/hooks/useLazyRef';
import { useToast } from '@/hooks/useToast';
import { errorLog, matchLog } from '@/utils/logger';

import { SubmitScoreParams } from './types/matchSubmissionTypes';
import { updateMatchScore } from './utils/matchDatabaseUtils';
import { invalidateMatchRelatedQueries } from './utils/queryCacheUtils';
import { useScoreValidation } from './validation/useScoreValidation';

export const useMatchSubmission = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { validateScore } = useScoreValidation();
  const submittingMatchIds = useLazyRef<Set<string>>(() => new Set());

  const handleSubmitScore = async (
    { matchId, team1Score, team2Score, team1GameWins = 0, team2GameWins = 0 }: SubmitScoreParams,
    options: { suppressToast?: boolean; suppressInvalidation?: boolean } = {}
  ) => {
    if (submittingMatchIds.current.has(matchId)) return false;
    submittingMatchIds.current.add(matchId);
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
        if (!options.suppressToast) {
          toast({
            title: 'Validation Error',
            description: validation.errorMessage,
            variant: 'destructive',
          });
        }
        return false;
      }

      // Update match score + reverse-any-previous + apply new counters
      // atomically via the resubmit_match_result RPC (inside updateMatchScore).
      await updateMatchScore({
        matchId,
        team1Score,
        team2Score,
        team1GameWins: parsedTeam1GameWins,
        team2GameWins: parsedTeam2GameWins,
      });

      // Invalidate all relevant query caches
      if (!options.suppressInvalidation) {
        await invalidateMatchRelatedQueries(queryClient);
      }

      if (!options.suppressToast) {
        toast({
          title: 'Scores Updated',
          description: 'Match scores have been successfully updated.',
        });
      }

      return true;
    } catch (error) {
      errorLog('[useMatchSubmission] Error updating scores:', error);
      if (!options.suppressToast) {
        toast({
          title: 'Error',
          description: 'Failed to update scores. Please try again.',
          variant: 'destructive',
        });
      }
      return false;
    } finally {
      submittingMatchIds.current.delete(matchId);
    }
  };

  return { handleSubmitScore };
};
