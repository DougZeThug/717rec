import React from 'react';

import { Team } from '@/types';

interface TeamDisplayProps {
  team: Team | null;
  fallbackLabel: string;
  animationDelay?: string;
}

const TeamDisplay: React.FC<TeamDisplayProps> = ({
  team,
  fallbackLabel,
  _animationDelay = '0.2s',
}) => {
  return (
    <div className="flex justify-center">
      {team?.imageUrl || team?.logoUrl ? (
        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100">
          <img
            src={team.imageUrl || team.logoUrl}
            alt={team.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">{fallbackLabel}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(TeamDisplay);
