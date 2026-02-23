import { errorLog, scoreLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';

export const useMatchScores = (
  matches: MatchWithTeams[],
  setMatches: (updater: MatchWithTeams[] | ((prev: MatchWithTeams[]) => MatchWithTeams[])) => void
) => {
  const validateMatchScores = (score1?: number | null, score2?: number | null): boolean => {
    return score1 !== undefined && score1 !== null && score2 !== undefined && score2 !== null;
  };

  const handleScoreChange = (index: number, team1Score: number, team2Score: number) => {
    scoreLog(`handleScoreChange for match at index ${index}`, { team1Score, team2Score });

    setMatches((prev) => {
      const match = prev[index];
      if (!match) {
        errorLog(`Match at index ${index} not found in array of ${prev.length} matches`);
        return prev;
      }

      const newMatches = [...prev];
      newMatches[index] = {
        ...match,
        team1Score,
        team2Score,
        isEdited: true,
        isValid: validateMatchScores(team1Score, team2Score),
      };
      return newMatches;
    });
  };

  const handleGameWinsChange = (index: number, team1GameWins: number, team2GameWins: number) => {
    scoreLog(`handleGameWinsChange for match at index ${index}`, { team1GameWins, team2GameWins });

    setMatches((prev) => {
      const match = prev[index];
      if (!match) {
        errorLog(`Match at index ${index} not found in array of ${prev.length} matches`);
        return prev;
      }

      const newMatches = [...prev];
      newMatches[index] = {
        ...match,
        team1_game_wins: team1GameWins,
        team2_game_wins: team2GameWins,
        isEdited: true,
        isValid: validateMatchScores(match.team1Score, match.team2Score),
      };
      return newMatches;
    });
  };

  const handleMarkCompleted = (index: number, checked: boolean) => {
    scoreLog(`handleMarkCompleted for match at index ${index}`, {
      checked,
      matches: matches.length,
      matchExists: Boolean(matches[index]),
    });

    setMatches((prev) => {
      const match = prev[index];
      if (!match) {
        errorLog(`Match at index ${index} not found in array of ${prev.length} matches`);
        return prev;
      }

      scoreLog(`Updating completion status for match ${match.id}`, {
        before: match.iscompleted,
        after: checked,
      });

      const newMatches = [...prev];
      newMatches[index] = {
        ...match,
        iscompleted: checked,
        isEdited: true,
      };
      return newMatches;
    });
  };

  const validationErrors = matches.reduce(
    (acc, match, index) => {
      if (match.isEdited && !match.isValid) {
        acc[index] = 'Invalid score values';
      }
      return acc;
    },
    {} as Record<number, string>
  );

  return {
    handleScoreChange,
    handleGameWinsChange,
    handleMarkCompleted,
    validationErrors,
  };
};
