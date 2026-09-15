import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TimeslotTransformer } from '@/services/timeslots/TimeslotTransformer';
import { TimeslotGroup } from '@/types/timeslots';

export const useTimeslotQuery = (date: Date | null) => {
  const query = useQuery({
    queryKey: ['timeslots', date ? format(date, 'yyyy-MM-dd') : null],
    queryFn: async () => {
      if (!date) {
        return { timeslots: [], groupedTimeslots: {} as TimeslotGroup };
      }

      const formattedData = await TimeslotService.fetchByDate(date);
      const grouped = TimeslotTransformer.groupByTimeslot(formattedData);

      return {
        timeslots: formattedData,
        groupedTimeslots: grouped,
      };
    },
    enabled: !!date,
    staleTime: 60_000,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
      return 60_000;
    },
    placeholderData: (prev) => prev,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  return {
    timeslots: query.data?.timeslots || [],
    groupedTimeslots: query.data?.groupedTimeslots || {},
    isLoading: query.isLoading,
    /**
     * True while the rows on screen belong to a **previously** chosen night.
     *
     * `placeholderData` keeps the last night's rows visible when the date
     * changes, rather than blanking the column. That is right for reading and
     * wrong for acting: anything that writes using these rows has to wait, or
     * it would act on another night's bookings. `isLoading` does not cover it —
     * with placeholder data present the query is no longer pending.
     */
    isPlaceholderData: query.isPlaceholderData,
    /**
     * True once a fetch for this date has actually returned rows — even an
     * empty set. False while nothing has arrived, which includes a **failed**
     * first load: the query settles with `data` undefined, so neither
     * `isLoading` nor `isPlaceholderData` is true any more and the two of them
     * together cannot tell "empty night" from "never loaded".
     *
     * A refetch that fails after a good load keeps the rows it already had, so
     * this stays true and the screen stays usable.
     */
    hasData: query.data !== undefined,
    error: query.error?.message || null,
  };
};
