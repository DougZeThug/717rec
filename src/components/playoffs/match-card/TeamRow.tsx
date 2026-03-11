import { CheckCircle } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';
import { Team } from '@/types';

interface TeamRowProps {
  team: Team | null;
  teamId?: string;
  teamSeed: number;
  score?: number;
  isWinner: boolean;
  matchType: string;
}

const TeamRow: React.FC<TeamRowProps> = ({
  team,
  _teamId,
  teamSeed,
  score,
  isWinner,
  matchType,
}) => {
  const getTeamRowClasses = (isWinner: boolean) =>
    cn(
      'flex items-center p-2 rounded-md',
      isWinner
        ? 'bg-green-50 border-l-4 border-green-500 dark:bg-green-900/20 dark:border-green-500'
        : 'bg-gray-50 dark:bg-gray-800/40'
    );

  return (
    <div className={getTeamRowClasses(isWinner)}>
      {team ? (
        <div className="flex items-center w-full">
          <div
            className={cn(
              'flex-none w-6 h-6 flex items-center justify-center mr-2 rounded-full',
              'bg-gray-200 dark:bg-gray-700 text-xs font-bold',
              matchType === 'winners' && 'bg-blue-100 dark:bg-blue-900/30'
            )}
          >
            {teamSeed}
          </div>

          <div className="flex-1 min-w-0 flex items-center">
            {team.imageUrl || team.logoUrl ? (
              <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 mr-2">
                <img
                  src={team.imageUrl || team.logoUrl}
                  alt={team.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <span className="truncate text-sm font-medium">{team.name}</span>
          </div>

          {score !== undefined && (
            <span
              className={cn(
                'flex-none ml-2 text-sm font-bold',
                isWinner ? 'text-green-600 dark:text-green-400' : ''
              )}
            >
              {score}
            </span>
          )}

          {isWinner && (
            <CheckCircle className="flex-none ml-1 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          )}
        </div>
      ) : (
        <span className="text-gray-400 italic text-sm">TBD</span>
      )}
    </div>
  );
};

export default TeamRow;
