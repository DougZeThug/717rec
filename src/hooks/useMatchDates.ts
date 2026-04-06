import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';

import { Match } from '@/types';
import { errorLog } from '@/utils/logger';

/**
 * Hook to extract unique dates that have scheduled matches.
 * Returns a Set of date strings in 'yyyy-MM-dd' format.
 */
export const useMatchDates = (matchesData: Match[] | undefined): Set<string> => {
  return useMemo(() => {
    if (!matchesData) return new Set<string>();

    const matchDates = new Set<string>();
    matchesData.forEach((match) => {
      if (match.date) {
        try {
          // Handle both ISO strings and date strings
          const date = typeof match.date === 'string' ? parseISO(match.date) : match.date;
          const dateStr = format(date, 'yyyy-MM-dd');
          matchDates.add(dateStr);
        } catch (e) {
          errorLog('Failed to parse match date "%s":', match.date, e);
        }
      }
    });

    return matchDates;
  }, [matchesData]);
};
