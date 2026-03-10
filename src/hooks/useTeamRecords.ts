import { useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { updateTeamStatsRecord } from '@/services/TeamStatsService';
import { Team } from '@/types';
import { debugLog, errorLog, teamLog } from '@/utils/logger';

import { invalidateMatchRelatedQueries } from './matches/utils/queryCacheUtils';

export const useTeamRecords = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Updates team records for a completed match
   * @param winnerId The ID of the winning team
   * @param loserId The ID of the losing team
   * @param teams Array of team data
   * @param winnerGameWins Number of games won by winner (default: 0)
   * @param loserGameWins Number of games won by loser (default: 0)
   */
  const updateTeamRecords = async (
    winnerId: string,
    loserId: string,
    teams: Team[],
    winnerGameWins: number = 0,
    loserGameWins: number = 0
  ) => {
    teamLog('===== TEAM RECORDS UPDATE PROCESS STARTING =====');
    teamLog('Winner ID:', winnerId, 'Loser ID:', loserId);
    teamLog('Game wins - Winner:', winnerGameWins, 'Loser:', loserGameWins);

    // Log types and values of team data
    if (teams && teams.length > 0) {
      teams.forEach((team) => {
        debugLog(`Team ${team.name} (${team.id}) current data:`, {
          wins: team.wins,
          winsType: typeof team.wins,
          losses: team.losses,
          lossesType: typeof team.losses,
          gameWins: team.game_wins,
          gameWinsType: typeof team.game_wins,
          gameLosses: team.game_losses,
          gameLossesType: typeof team.game_losses,
        });
      });
    }

    try {
      teamLog('Step 1: Updating detailed team statistics in the database');

      const statsSuccess = await updateTeamStatsRecord(
        winnerId,
        loserId,
        winnerGameWins,
        loserGameWins
      );

      if (!statsSuccess) {
        errorLog('CRITICAL ERROR: Failed to update team stats record');
        toast({
          title: 'Error',
          description: 'Failed to update team records. Please try again.',
          variant: 'destructive',
        });
        return false;
      }

      teamLog('Step 1 SUCCESSFUL: Team detailed statistics updated');
      teamLog('Step 2: Invalidating all relevant queries to ensure data freshness');

      await invalidateMatchRelatedQueries(queryClient);

      teamLog('Step 2 SUCCESSFUL: Query cache invalidated');

      toast({
        title: 'Success',
        description: 'Team records and statistics have been updated successfully.',
      });

      teamLog('===== TEAM RECORDS UPDATE PROCESS COMPLETED SUCCESSFULLY =====');
      return true;
    } catch (error) {
      errorLog('===== TEAM RECORDS UPDATE PROCESS FAILED =====');
      errorLog('Error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while updating team records.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    updateTeamRecords,
  };
};
