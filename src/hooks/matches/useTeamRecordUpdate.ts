
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useToast } from "@/hooks/use-toast";

export const useTeamRecordUpdate = () => {
  const { updateTeamRecords } = useTeamRecords();
  const { toast } = useToast();

  const updateTeamStats = async (
    winnerId: string, 
    loserId: string,
    teams: any[],
    winnerGameWins: number,
    loserGameWins: number
  ) => {
    if (!winnerId || !loserId) {
      console.warn('Missing winner or loser ID for team stats update');
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
      console.warn('Team records update partially failed');
      toast({
        title: 'Partial Update',
        description: 'Match scores updated, but team records may not be fully synchronized.',
        variant: 'default'
      });
      return false;
    }

    return true;
  };

  return { updateTeamStats };
};
