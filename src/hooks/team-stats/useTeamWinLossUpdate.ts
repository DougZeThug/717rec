
import { useQueryClient } from "@tanstack/react-query";
import { invalidateMatchRelatedQueries } from "../matches/utils/queryCacheUtils";
import { errorLog } from "@/utils/logger";

export const useTeamWinLossUpdate = () => {
  const queryClient = useQueryClient();

  const updateTeamRecords = async () => {
    try {
      // Since we now calculate stats directly from matches table,
      // we just need to invalidate queries to refresh the UI
      await invalidateMatchRelatedQueries(queryClient);
      return true;
    } catch (error) {
      errorLog("[useTeamWinLossUpdate] Error:", error);
      return false;
    }
  };

  return { updateTeamRecords };
};
