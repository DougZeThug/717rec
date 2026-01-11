import { Trophy, X } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';
import { Team } from '@/types';
import { formatPowerScore, getPowerScoreColor, getSosColor } from '@/utils/colors';

interface TeamStatsProps {
  team: Team;
  isWinter?: boolean;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ team, isWinter = false }) => {
  const labelClasses = cn(
    'font-inter uppercase text-xs tracking-widest',
    isWinter ? 'text-cyan-300/70' : 'text-gray-500 dark:text-gray-400'
  );

  const valueClasses = cn(
    'font-mono text-base font-medium tabular-nums',
    isWinter ? 'text-cyan-50' : 'text-gray-800 dark:text-white'
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col">
        <span className={labelClasses}>Record</span>
        <div className={cn(valueClasses, 'flex items-center')}>
          <Trophy size={14} className={isWinter ? 'text-cyan-400 mr-1' : 'text-emerald-500 mr-1'} />{' '}
          {team.wins || 0}
          <span className="mx-1">-</span>
          <X size={14} className="text-rose-500 mr-1" /> {team.losses || 0}
        </div>
      </div>

      <div className="flex flex-col">
        <span className={labelClasses}>Power Score</span>
        <span
          className={cn(
            'font-mono text-base font-medium tabular-nums',
            isWinter ? 'text-cyan-300' : getPowerScoreColor(team.power_score)
          )}
        >
          {formatPowerScore(team.power_score)}
        </span>
      </div>

      {team.sos !== undefined && (
        <div className="flex flex-col">
          <span className={labelClasses}>SOS</span>
          <span
            className={cn(
              'font-mono text-base font-medium tabular-nums',
              (team.wins || 0) + (team.losses || 0) > 0
                ? isWinter
                  ? 'text-cyan-200'
                  : getSosColor(team.sos)
                : 'text-muted-foreground'
            )}
          >
            {(team.wins || 0) + (team.losses || 0) > 0 ? team.sos.toFixed(3) : 'N/A'}
          </span>
        </div>
      )}
    </div>
  );
};
