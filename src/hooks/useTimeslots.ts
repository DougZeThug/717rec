import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

import { TeamTimeslot } from '@/types/timeslots';

import { useTimeslotMutation } from './useTimeslotMutation';
import { useTimeslotQuery } from './useTimeslotQuery';

export const useTimeslots = (date: Date) => {
  const queryClient = useQueryClient();
  const { timeslots, groupedTimeslots, isLoading, error } = useTimeslotQuery(date);
  const { isSubmitting, addTimeslot, deleteTimeslot, batchAssignTimeslots, batchAssignDoubleHeaders } =
    useTimeslotMutation();

  // Function to refresh timeslots data (useful after bye week operations)
  const refreshTimeslots = () => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    queryClient.invalidateQueries({ queryKey: ['timeslots', formattedDate] });
  };

  // External API remains consistent with previous implementation
  return {
    timeslots,
    isLoading: isLoading || isSubmitting,
    error,
    groupedTimeslots,
    addTimeslot,
    deleteTimeslot,
    batchAssignTimeslots,
    batchAssignDoubleHeaders,
    refreshTimeslots,
  };
};
