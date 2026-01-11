import React from 'react';

import WeekTimeslotDisplay from './WeekTimeslotDisplay';

interface TeamTimeslotDisplayProps {
  teamId: string;
  teamName: string;
  date?: Date;
  enableBatchAssignment?: boolean;
}

const TeamTimeslotDisplay: React.FC<TeamTimeslotDisplayProps> = ({
  teamId,
  teamName,
  date = new Date(),
  enableBatchAssignment = false,
}) => {
  return (
    <WeekTimeslotDisplay
      teamId={teamId}
      teamName={teamName}
      enableBatchAssignment={enableBatchAssignment}
    />
  );
};

export default TeamTimeslotDisplay;
