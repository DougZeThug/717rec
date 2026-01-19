import { useQueryClient } from '@tanstack/react-query';

import { dbLog, errorLog, scoreLog } from '@/utils/logger';

import { useMatchUpdateService } from '../services/matchUpdateService';
import { MatchWithTeams } from '../types';
import { useMatchValidation } from './submission/useMatchValidation';
import { useSubmissionState } from './useSubmissionState';

export const useScoreSubmission = (
  matches: MatchWithTeams[],
  fetchMatches: () => Promise<MatchWithTeams[]>
) => {
  const queryClient = useQueryClient();
  const { validateMatch } = useMatchValidation();
  const { updateMatch } = useMatchUpdateService();
  const { submitting, setSubmitting, failedMatches, errorMessages, clearErrors, toast } =
    useSubmissionState();

  const handleSubmitAll = async () => {
    if (!matches || !Array.isArray(matches)) {
      toast({
        title: 'Error',
        description: 'No match data available',
        variant: 'destructive',
      });
      return;
    }

    const editedMatches = matches.filter(
      (match) => match && match.isEdited && match.isValid && match.iscompleted
    );

    scoreLog(
      `Found ${editedMatches.length} edited, valid, and completed matches out of ${matches.length} total matches`
    );

    if (editedMatches.length === 0) {
      toast({
        title: 'No Changes',
        description: 'There are no valid, completed changes to submit.',
      });
      return;
    }

    scoreLog(`Processing ${editedMatches.length} edited matches`);
    setSubmitting(true);
    clearErrors();
    let successCount = 0;

    try {
      for (const match of editedMatches) {
        const validationResult = validateMatch({
          ...match,
          team1Score: match.team1Score ?? 0,
          team2Score: match.team2Score ?? 0,
          team1_game_wins: match.team1_game_wins ?? 0,
          team2_game_wins: match.team2_game_wins ?? 0,
        });

        if (!validationResult.isValid || !validationResult.correctedMatch) {
          scoreLog(`Match ${match.id} failed validation`);
          continue;
        }

        const success = await updateMatch(validationResult.correctedMatch);
        if (success) {
          successCount++;
        }
      }

      if (failedMatches.length === 0) {
        toast({
          title: 'Success',
          description: `Updated ${successCount} match results and refreshed team statistics.`,
        });
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Updated ${successCount} matches. ${failedMatches.length} matches failed to update.`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: `Failed to update any matches. Please check the error messages and try again.`,
          variant: 'destructive',
        });
      }

      invalidateAllDataQueries();

      if (successCount > 0) {
        try {
          await fetchMatches();
        } catch (error) {
          errorLog('Error refreshing matches:', error);
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog('Error in batch update:', errorMessage);
      toast({
        title: 'Error',
        description: `Failed to update matches: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const invalidateAllDataQueries = () => {
    dbLog('Invalidating all data queries for fresh data');
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['teams'] });
    queryClient.invalidateQueries({ queryKey: ['rankings'] });
    queryClient.invalidateQueries({ queryKey: ['teamStats'] });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    queryClient.invalidateQueries({ queryKey: ['team-matches'] });
  };

  return {
    submitting,
    failedMatches,
    errorMessages,
    handleSubmitAll,
    clearErrors,
  };
};
