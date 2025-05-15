
import { useCallback } from 'react';
import { useTeamScheduleLoader } from '../useTeamScheduleLoader';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateNormalization';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';

export const useTeamOperations = () => {
  const { 
    isLoading, 
    timeBlockTeams, 
    loadTeamsForDate, 
    getTeamCountStatus 
  } = useTeamScheduleLoader();
  
  const { toast } = useToast();

  // Enhanced team loading with improved error handling and date normalization
  const handleLoadTeams = useCallback(async (selectedDate: Date | null) => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      // Improved logging for date debugging
      console.log('useAutoSchedule - handleLoadTeams - Before loadTeamsForDate', {
        selectedDate,
        selectedDateType: typeof selectedDate,
        selectedDateObj: selectedDate instanceof Date,
        selectedDateString: selectedDate.toString(),
        selectedDateIso: selectedDate.toISOString(),
        selectedDateTimestamp: selectedDate.getTime(),
        simpleDateString: normalizeDate(selectedDate, 'handleLoadTeams-before'),
        availableTimeBlocks: Object.keys(TIME_BLOCKS)
      });
      
      // Create a safe date copy to ensure time is set to noon
      const safeDate = new Date(selectedDate);
      safeDate.setHours(12, 0, 0, 0);
      
      console.log('Using safe date for team loading:', {
        safeDate,
        safeDateString: safeDate.toString(),
        safeDateIso: safeDate.toISOString(),
        normalizedSafeDate: normalizeDate(safeDate, 'safeDate')
      });
      
      // Load teams with the safe date
      const timeBlockData = await loadTeamsForDate(safeDate);
      
      const { total, odd } = getTeamCountStatus();
      
      console.log('useAutoSchedule - handleLoadTeams - After loadTeamsForDate', {
        teamsFound: total,
        oddBlocks: odd,
        simpleDateString: normalizeDate(safeDate, 'handleLoadTeams-after'),
        timeBlockData
      });
      
      if (total === 0) {
        // If no teams are found, try to determine if it's a data or date format issue
        if (timeBlockData && Object.keys(timeBlockData).length > 0) {
          const emptyBlocks = Object.entries(timeBlockData)
            .filter(([_, teams]) => teams.length === 0)
            .map(([block]) => block);
          
          console.warn(`Time blocks with no teams: ${emptyBlocks.join(', ')}`);
          
          toast({
            title: "No teams found",
            description: `No teams are scheduled for ${normalizeDate(safeDate, 'toast')}. Please check team assignments in the Timeslots section.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "No teams found",
            description: `No teams are scheduled for ${normalizeDate(safeDate, 'toast')}. Check if date format matches database entries.`,
            variant: "destructive"
          });
        }
        return null;
      }
      
      toast({
        title: "Teams loaded",
        description: `Loaded ${total} teams${odd > 0 ? ` (${odd} blocks have odd team counts)` : ''}`,
      });
      
      return timeBlockData;
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams. Please check console for details.",
        variant: "destructive"
      });
      return null;
    }
  }, [loadTeamsForDate, toast, getTeamCountStatus]);

  return {
    isLoading,
    timeBlockTeams,
    handleLoadTeams,
    getTeamCountStatus
  };
};
