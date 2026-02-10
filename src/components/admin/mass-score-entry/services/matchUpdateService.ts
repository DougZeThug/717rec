import { useToast } from '@/hooks/useToast';
import { errorLog } from '@/utils/logger';

import { MatchWithTeams } from '../types';
import { updateMatchInDatabase } from './matchUpdateCore';

export const useMatchUpdateService = () => {
  const { toast } = useToast();

  const updateMatch = async (match: MatchWithTeams): Promise<boolean> => {
    try {
      const success = await updateMatchInDatabase(match);
      if (!success) {
        return false;
      }

      // Team stats (wins, losses, game_wins, etc.) are calculated dynamically
      // by the v_team_details database view from completed matches.
      // No need to manually increment the teams table columns here.

      return true;
    } catch (error) {
      errorLog(`Error updating match ${match.id}:`, error);
      return false;
    }
  };

  return { updateMatch };
};
