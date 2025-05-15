
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

  // Handle loading teams for a date with improved error handling and logging
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
      console.log('useAutoSchedule - handleLoadTeams - Before loadTeamsForDate', {
        selectedDate,
        selectedDateString: selectedDate.toString(),
        selectedDateIso: selectedDate.toISOString(),
        simpleDateString: normalizeDate(selectedDate, 'handleLoadTeams-before'),
        availableTimeBlocks: Object.keys(TIME_BLOCKS)
      });
      
      const timeBlockData = await loadTeamsForDate(selectedDate);
      
      const { total, odd } = getTeamCountStatus();
      
      console.log('useAutoSchedule - handleLoadTeams - After loadTeamsForDate', {
        teamsFound: total,
        oddBlocks: odd,
        simpleDateString: normalizeDate(selectedDate, 'handleLoadTeams-after'),
        timeBlockData
      });
      
      if (total === 0) {
        // Check if we got data but it's empty
        if (timeBlockData && Object.keys(timeBlockData).length > 0) {
          const emptyBlocks = Object.entries(timeBlockData)
            .filter(([_, teams]) => teams.length === 0)
            .map(([block]) => block);
          
          console.warn(`Time blocks with no teams: ${emptyBlocks.join(', ')}`);
          
          toast({
            title: "No teams found",
            description: `No teams are scheduled for ${normalizeDate(selectedDate, 'toast')}. Please check team assignments in the Timeslots section.`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "No teams found",
            description: `No teams are scheduled for ${normalizeDate(selectedDate, 'toast')}. Check if date format matches database entries.`,
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
