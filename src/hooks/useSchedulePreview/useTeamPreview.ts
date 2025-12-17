
import { useCallback } from 'react';
import { TimeBlockTeamsMap, PreviewResult } from '@/types/autoSchedule';
import { useToast } from '@/hooks/use-toast';
import { useTeamScheduleLoader } from '../useTeamScheduleLoader';
import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';
import { normalizeDate } from '@/utils/dateNormalization';
import { TeamCountsStatus } from './types';
import { scheduleLog, errorLog } from '@/utils/logger';

export const useTeamPreview = (
  setTimeBlockTeams: (teams: TimeBlockTeamsMap) => void,
  setIsLoading: (loading: boolean) => void
) => {
  const { loadTeamsForDate, getTeamCountStatus } = useTeamScheduleLoader();
  const { toast } = useToast();

  // Enhanced team preview with improved date handling
  const previewSchedule = useCallback(async (date: Date): Promise<PreviewResult | null> => {
    if (!date) {
      toast({
        title: "Error",
        description: "Please select a valid date",
        variant: "destructive"
      });
      return null;
    }

    setIsLoading(true);
    try {
      // Enhanced logging for date debugging
      scheduleLog("useTeamPreview - previewSchedule date:", {
        date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        dateTime: date.getTime(),
        simpleDateString: normalizeDate(date, 'useTeamPreview')
      });
      
      // Create a safe date copy to ensure time is set to noon
      const safeDate = new Date(date);
      safeDate.setHours(12, 0, 0, 0);
      
      scheduleLog('Using safe date for preview schedule:', {
        safeDate,
        safeDateString: safeDate.toString(),
        safeDateIso: safeDate.toISOString(),
        normalizedSafeDate: normalizeDate(safeDate, 'safePreview')
      });
      
      // Load teams for the selected date
      const teamsData = await loadTeamsForDate(safeDate);
      
      if (!teamsData) {
        toast({
          title: "Error",
          description: "Failed to load teams data",
          variant: "destructive"
        });
        return null;
      }
      
      // Update state with loaded teams
      setTimeBlockTeams(teamsData);
      
      // Validate team counts to identify insufficient and odd blocks
      const { isValid, insufficientBlocks } = validateTeamCounts(teamsData);
      
      // Check if we have even number of teams in each block
      const unmatchableBlocks: string[] = [];
      Object.entries(teamsData).forEach(([block, teams]) => {
        if (teams.length % 2 !== 0) {
          unmatchableBlocks.push(block);
        }
      });
      
      if (unmatchableBlocks.length > 0) {
        toast({
          title: "Warning",
          description: `Blocks with odd number of teams: ${unmatchableBlocks.join(', ')}. Some teams may not get matched.`,
        });
      }
      
      if (insufficientBlocks.length > 0) {
        toast({
          title: "Warning",
          description: `Blocks with insufficient teams: ${insufficientBlocks.join(', ')}. These blocks cannot create matches.`,
        });
      }
      
      return {
        date: safeDate,
        timeBlocks: teamsData,
        unmatchableBlocks
      };
    } catch (error) {
      errorLog('Error previewing schedule:', error);
      toast({
        title: "Error",
        description: "Failed to preview schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadTeamsForDate, setIsLoading, setTimeBlockTeams, toast]);

  // Get team counts status
  const getTeamCounts = useCallback((): TeamCountsStatus => {
    return getTeamCountStatus();
  }, [getTeamCountStatus]);

  return {
    previewSchedule,
    getTeamCounts
  };
};
