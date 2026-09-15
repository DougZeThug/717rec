import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { useTimeslotMutation } from './useTimeslotMutation';
import { useTimeslotQuery } from './useTimeslotQuery';

export const useTimeslots = (date: Date) => {
  const queryClient = useQueryClient();
  const { timeslots, groupedTimeslots, isLoading, isPlaceholderData, hasData, error } =
    useTimeslotQuery(date);
  const {
    isSubmitting,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    assignByeWeek,
    batchAssignByeWeeks,
    removeByeWeek,
    moveTeamBooking,
  } = useTimeslotMutation();

  // Function to refresh timeslots data (useful after bye week operations)
  const refreshTimeslots = () => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
  };

  // External API remains consistent with previous implementation
  return {
    timeslots,
    isLoading: isLoading || isSubmitting,
    /** Just the write, so a form can disable its own submit button. */
    isSubmitting,
    /**
     * True when `timeslots` really is this date's rows. Anything that writes
     * using them must wait for it: while a newly chosen night loads, the rows
     * on screen are still the night before's, and their ids are too.
     *
     * `hasData` is what separates a night that is genuinely empty from one
     * whose rows never arrived. Without it a failed first load read as loaded
     * and empty, and the move card would book a team its rows already held a
     * slot for — clearing nothing, so the team ended up booked twice.
     */
    isNightLoaded: !isLoading && !isPlaceholderData && hasData,
    error,
    groupedTimeslots,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    assignByeWeek,
    batchAssignByeWeeks,
    removeByeWeek,
    moveTeamBooking,
    refreshTimeslots,
  };
};
