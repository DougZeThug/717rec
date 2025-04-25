
import { Team } from "@/types";
import { useTeamRecords } from "@/hooks/useTeamRecords";
import { useToast } from "@/hooks/use-toast";

export const useTeamRecordUpdate = () => {
  const { updateTeamRecords } = useTeamRecords();
  const { toast } = useToast();

  const updateTeamRecordsForMatch = async (
    winnerId: string | null,
    loserId: string | null,
    teams: Team[],
    winnerGameWins: number,
    loserGameWins: number
  ): Promise<boolean> => {
    if (!winnerId || !loserId || !teams.length) {
      return false;
    }

    const updateSuccess = await updateTeamRecords(
      winnerId,
      loserId,
      teams,
      winnerGameWins,
      loserGameWins
    );

    if (!updateSuccess) {
      toast({
        title: "Partial Success",
        description: `Match updated, but team records may not have been updated properly.`,
        variant: "default"
      });
      return false;
    }

    return true;
  };

  return { updateTeamRecordsForMatch };
};
