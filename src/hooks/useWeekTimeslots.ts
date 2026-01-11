import { endOfWeek, startOfWeek } from 'date-fns';
import { useEffect, useState } from 'react';

import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TeamTimeslot } from '@/types';
import { errorLog } from '@/utils/logger';

interface UseWeekTimeslotsResult {
  timeslots: TeamTimeslot[];
  isLoading: boolean;
}

export const useWeekTimeslots = (teamId: string): UseWeekTimeslotsResult => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeekTimeslots = async () => {
      setIsLoading(true);

      try {
        const today = new Date();
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

        const result = await TimeslotService.fetchByTeamAndDateRange(
          teamId,
          weekStart,
          weekEnd
        );

        if (!result.success) {
          errorLog('Error fetching week timeslots:', result.error);
          setTimeslots([]);
          return;
        }

        setTimeslots((result.data as TeamTimeslot[]) || []);
      } catch (error) {
        errorLog('Error fetching week timeslots:', error);
        setTimeslots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeekTimeslots();
  }, [teamId]);

  return {
    timeslots,
    isLoading,
  };
};
