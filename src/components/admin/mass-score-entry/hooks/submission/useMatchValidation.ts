import { validationLog } from '@/utils/logger';

import { MatchWithTeams } from '../../types';
import { validateMatchSubmission } from '../../utils/matchSubmissionUtils';
import { useSubmissionState } from '../useSubmissionState';

export interface ValidationResult {
  isValid: boolean;
  correctedMatch?: MatchWithTeams;
}

export const useMatchValidation = () => {
  const { addError } = useSubmissionState();

  const validateMatch = (match: MatchWithTeams): ValidationResult => {
    // Parse game wins as integers
    const team1GameWins = parseInt(String(match.team1_game_wins)) || 0;
    const team2GameWins = parseInt(String(match.team2_game_wins)) || 0;

    // Log validation attempt
    validationLog(`Validating match before submission:`, {
      matchId: match.id,
      matchDate: match.date,
      team1GameWins,
      team2GameWins,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
    });

    // Create a corrected copy instead of mutating the input
    const correctedMatch: MatchWithTeams = {
      ...match,
      team1_game_wins: team1GameWins,
      team2_game_wins: team2GameWins,
    };

    // Recalculate binary match scores based on game wins
    if (team1GameWins > team2GameWins) {
      correctedMatch.team1Score = 1;
      correctedMatch.team2Score = 0;
    } else if (team1GameWins < team2GameWins) {
      correctedMatch.team1Score = 0;
      correctedMatch.team2Score = 1;
    } else {
      addError(match.id, 'Game wins cannot be tied');
      return { isValid: false };
    }

    const validation = validateMatchSubmission(correctedMatch);
    if (!validation.isValid) {
      addError(match.id, validation.errorMessage || 'Invalid match data');
      return { isValid: false };
    }

    return { isValid: true, correctedMatch };
  };

  return { validateMatch };
};
