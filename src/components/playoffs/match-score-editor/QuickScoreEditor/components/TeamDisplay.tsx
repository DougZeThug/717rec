import React from 'react';

import { Team } from '@/types';

interface TeamDisplayProps {
  team: Team | null;
  fallbackLabel: string;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({
  team,
  fallbackLabel,
}) => {
  return (
    <div className="flex justify-center">
      {team?.imageUrl || team?.logoUrl ? (
        <div className="size-16 rounded-full overflow-hidden bg-muted">
          <img
            src={team.imageUrl || team.logoUrl || undefined}
            alt={team.name}
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="size-16 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(TeamDisplay);
