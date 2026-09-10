import { useQuery } from '@tanstack/react-query';

import { TimeslotService } from '@/services/timeslots/TimeslotService';

/**
 * Every night that has posted timeslots, as 'yyyy-MM-dd' strings, newest first.
 *
 * The schedule page's date list is otherwise built from matches alone, so a
 * night whose slots are posted but whose matches are not created yet would be
 * invisible — and the page would open on last week.
 */
export const useTimeslotDates = () => {
  const query = useQuery({
    queryKey: ['timeslot-dates'],
    queryFn: () => TimeslotService.fetchTimeslotDates(),
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  return {
    timeslotDates: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  };
};
