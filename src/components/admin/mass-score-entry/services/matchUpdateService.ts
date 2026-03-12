import { useTeamRecordUpdate } from '@/hooks/matches/useTeamRecordUpdate';
import { useToast } from '@/hooks/useToast';
import { errorLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';
import { determineWinnerLoser, updateMatchInDatabase } from './matchUpdateCore';

export const useMatchUpdateService = () => {
  const { updateTeamStats } = useTeamRecordUpdate();
  const { toast: _toast } = useToast();

  const updateMatch = async (match: MatchWithTeams): Promise<boolean> => {
    try {
      const success = await updateMatchInDatabase(match);
      if (!success) {
        return false;
      }

      // Use the same winner/loser determination logic as matchUpdateCore
      const result = determineWinnerLoser(match);

      if (match.iscompleted && result && match.team1 && match.team2) {
        const { winnerId, loserId } = result;
        const teams = [match.team1, match.team2];

        const winnerGameWins =
          parseInt(
            String(winnerId === match.team1Id ? match.team1_game_wins : match.team2_game_wins)
          ) || 0;
        const loserGameWins =
          parseInt(
            String(loserId === match.team1Id ? match.team1_game_wins : match.team2_game_wins)
          ) || 0;

        await updateTeamStats(winnerId, loserId, teams, winnerGameWins, loserGameWins);
      }

      return true;
    } catch (error) {
      errorLog(`Error updating match ${match.id}:`, error);
      return false;
    }
  };

  return { updateMatch };
};
