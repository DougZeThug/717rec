import { endOfWeek, format, startOfWeek } from 'date-fns';
import { Clock } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/loading-state';
import { TimeslotService } from '@/services/timeslots/TimeslotService';
import { TeamTimeslot } from '@/types';
import { errorLog } from '@/utils/logger';

interface WeekTimeslotDisplayProps {
  teamId: string;
  teamName?: string;
  enableBatchAssignment?: boolean;
}

const WeekTimeslotDisplay: React.FC<WeekTimeslotDisplayProps> = ({
  teamId,
  teamName,
  enableBatchAssignment = false,
}) => {
  const [timeslots, setTimeslots] = useState<TeamTimeslot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get current week's date range
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  useEffect(() => {
    const fetchWeekTimeslots = async () => {
      setIsLoading(true);

      try {
        const startDate = format(weekStart, 'yyyy-MM-dd');
        const endDate = format(weekEnd, 'yyyy-MM-dd');

        const data = await TimeslotService.fetchWeekTimeslotsByTeam(teamId, startDate, endDate);

        setTimeslots(data || []);
      } catch (error) {
        errorLog('Error fetching week timeslots:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeekTimeslots();
  }, [teamId]);

  if (isLoading) {
    return (
      <Card className="bg-muted">
        <CardContent className="pt-6 pb-4">
          <LoadingState variant="section" message="Loading timeslots..." />
        </CardContent>
      </Card>
    );
  }

  if (timeslots.length === 0) {
    return (
      <Card className="bg-muted">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">This Week's Timeslot</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-muted-foreground">No timeslots assigned this week</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          This Week's Timeslot{timeslots.length > 1 ? 's' : ''}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {timeslots.map((timeslot) => (
          <div key={timeslot.id} className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <div>
              <p className="font-medium">{timeslot.timeslot}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(timeslot.match_date), 'EEE, MMM d')}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default WeekTimeslotDisplay;
