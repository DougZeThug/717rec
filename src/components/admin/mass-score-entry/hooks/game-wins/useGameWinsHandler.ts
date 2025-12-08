import { MatchWithTeams } from '../../types';
import { scoreLog, warnLog } from '@/utils/logger';

export const useGameWinsHandler = () => {
  const calculateMatchScore = (team1GameWins: number, team2GameWins: number) => {
    if (team1GameWins > team2GameWins) {
      return { team1Score: 1, team2Score: 0 };
    } else if (team1GameWins < team2GameWins) {
      return { team1Score: 0, team2Score: 1 };
    }
    return null;
  };

  const handleGameWinsChange = (
    match: MatchWithTeams,
    team1GameWins: number,
    team2GameWins: number
  ): Partial<MatchWithTeams> => {
    const numericTeam1GameWins = Number(team1GameWins);
    const numericTeam2GameWins = Number(team2GameWins);
    
    scoreLog(`useGameWinsHandler handleGameWinsChange for match ${match.id}:`, {
      matchId: match.id,
      matchDate: match.date,
      newGameWins: {
        team1GameWins: numericTeam1GameWins,
        team2GameWins: numericTeam2GameWins
      },
      gameWinsTypes: {
        team1GameWinsType: typeof numericTeam1GameWins,
        team2GameWinsType: typeof numericTeam2GameWins
      }
    });
    
    const matchScore = calculateMatchScore(numericTeam1GameWins, numericTeam2GameWins);
    if (!matchScore) {
      warnLog(`Cannot determine match score from game wins: ${numericTeam1GameWins}-${numericTeam2GameWins}`);
      return {};
    }

    scoreLog(`Match score calculated from game wins ${numericTeam1GameWins}-${numericTeam2GameWins}:`, matchScore);

    return {
      team1_game_wins: numericTeam1GameWins,
      team2_game_wins: numericTeam2GameWins,
      team1Score: matchScore.team1Score,
      team2Score: matchScore.team2Score,
      isEdited: true,
      isValid: true
    };
  };

  return {
    handleGameWinsChange,
    calculateMatchScore
  };
};
