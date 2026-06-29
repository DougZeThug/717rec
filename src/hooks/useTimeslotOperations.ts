import { format } from 'date-fns';

import { useToast } from '@/hooks/useToast';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import { errorLog, scheduleLog } from '@/utils/logger';

// Fetch timeslots for a specific date
const fetchTimeslotsByDate = async (date: Date | null) => {
  if (!date) {
    return [];
  }

  try {
    // Format date as YYYY-MM-DD for database queries
    const formattedDate = format(date, 'yyyy-MM-dd');

    const data = await TimeslotService.fetchTimeslotsForDate(formattedDate);

    // Normalize raw rows to the TeamTimeslot type
    return TimeslotTransformer.formatTimeslotResponse(data);
  } catch (error) {
    errorLog('Error fetching timeslots:', error);
    throw error;
  }
};

export const useTimeslotOperations = () => {
  const { toast } = useToast();

  // Add a new timeslot assignment
  const addTimeslot = async (date: Date, teamId: string, timeslot: string) => {
    try {
      scheduleLog('Adding timeslot:', { date: format(date, 'yyyy-MM-dd'), teamId, timeslot });

      const data = await TimeslotService.insertTimeslot(
        format(date, 'yyyy-MM-dd'),
        teamId,
        timeslot
      );

      // Normalize the returned row to the TeamTimeslot type
      return TimeslotTransformer.formatSingleTimeslot(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error adding timeslot:', error);
      toast({
        title: 'Error',
        description: `Failed to assign timeslot: ${message}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Delete a timeslot assignment
  const deleteTimeslot = async (id: string) => {
    try {
      await TimeslotService.deleteTimeslotSimple(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error deleting timeslot:', error);
      toast({
        title: 'Error',
        description: `Failed to remove timeslot: ${message}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Batch assign multiple teams to the same timeslot
  const batchAssignTimeslots = async (date: Date, teamIds: string[], timeslot: string) => {
    try {
      scheduleLog('Batch assigning timeslots:', {
        date: format(date, 'yyyy-MM-dd'),
        count: teamIds.length,
        timeslot,
      });

      // Create an array of objects for batch insert
      const insertData = teamIds.map((teamId) => ({
        match_date: format(date, 'yyyy-MM-dd'),
        team_id: teamId,
        timeslot,
      }));

      // Use a single batch insert instead of multiple calls
      const data = await TimeslotService.batchInsertTimeslots(insertData);

      scheduleLog('Batch assignment successful, count:', data?.length);

      // Normalize the returned rows to the TeamTimeslot type
      return TimeslotTransformer.formatTimeslotResponse(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error in batch assignment:', error);
      toast({
        title: 'Error',
        description: `Failed to batch assign timeslots: ${message}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    fetchTimeslotsByDate,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
  };
};
