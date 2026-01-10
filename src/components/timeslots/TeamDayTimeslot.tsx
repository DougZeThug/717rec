import { Clock } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { TeamTimeslot } from '@/types';

import TeamDayTimeslotSkeleton from './TeamDayTimeslotSkeleton';

interface TeamDayTimeslotProps {
  teamId: string;
  date: Date;
  timeslots: TeamTimeslot[];
  isLoading?: boolean;
}

const TeamDayTimeslot: React.FC<TeamDayTimeslotProps> = ({
  teamId,
  date,
  timeslots,
  isLoading = false,
}) => {
  // Find timeslot for this team on the specified date
  const teamTimeslot = timeslots.find((ts) => ts.team_id === teamId);

  if (isLoading) {
    return <TeamDayTimeslotSkeleton />;
  }

  if (!teamTimeslot) {
    return null;
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1 bg-gray-50">
      <Clock className="h-3 w-3 text-cornhole-navy" />
      <span className="text-xs">{teamTimeslot.timeslot}</span>
    </Badge>
  );
};

export default TeamDayTimeslot;
