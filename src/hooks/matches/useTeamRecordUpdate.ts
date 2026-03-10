import { useTeamRecords } from '@/hooks/useTeamRecords';
import { useToast } from '@/hooks/useToast';
import { warnLog } from '@/utils/logger';

import { useTeamStatsValidation } from './validation/useTeamStatsValidation';

export const useTeamRecordUpdate = () => {
  const { updateTeamRecords } = useTeamRecords();
  const { toast } = useToast();
  const { validateTeamStats } = useTeamStatsValidation();

  const updateTeamStats = async (
    winnerId: string,
    loserId: string,
    teams: any[],
    winnerGameWins: number,
    loserGameWins: number
  ) => {
    // Validate team stats
    const validation = validateTeamStats(winnerId, loserId, winnerGameWins, loserGameWins);
    if (!validation.isValid) {
      warnLog(validation.errorMessage);
      toast({
        title: 'Validation Error',
        description: validation.errorMessage,
        variant: 'destructive',
      });
      return false;
    }

    const teamsUpdateSuccess = await updateTeamRecords(
      winnerId,
      loserId,
      teams,
      winnerGameWins,
      loserGameWins
    );

    if (!teamsUpdateSuccess) {
      warnLog('Team records update partially failed');
      toast({
        title: 'Partial Update',
        description: 'Match scores updated, but team records may not be fully synchronized.',
        variant: 'default',
      });
      return false;
    }

    return true;
  };

  return { updateTeamStats };
};
