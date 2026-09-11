import { Trophy, X } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';
import { Team } from '@/types';
import { formatPowerScore, getPowerScoreColor, getSosColor } from '@/utils/colors';

interface TeamStatsProps {
  team: Team;
  isWinter?: boolean;
}

const VALUE_CLASSES = 'font-mono text-base font-medium tabular-nums';

/** One labelled figure in the grid. */
const StatCell: React.FC<{
  label: string;
  labelClasses: string;
  children: React.ReactNode;
}> = ({ label, labelClasses, children }) => (
  <div className="flex flex-col">
    <span className={labelClasses}>{label}</span>
    {children}
  </div>
);

/**
 * Strength of schedule, and how to colour it.
 *
 * A team that has not played yet has no meaningful SOS, so it reads "N/A" in
 * muted text rather than a colour-coded 0.000. Pulled out of the render because
 * it was a ternary inside a ternary.
 */
const sosDisplay = (team: Team, isWinter: boolean): { text: string; className: string } => {
  const played = (team.wins || 0) + (team.losses || 0);
  if (played === 0) {
    return { text: 'N/A', className: 'text-muted-foreground' };
  }
  return {
    text: (team.sos ?? 0).toFixed(3),
    className: isWinter ? 'text-cyan-200' : getSosColor(team.sos),
  };
};

export const TeamStats: React.FC<TeamStatsProps> = ({ team, isWinter = false }) => {
  const labelClasses = cn(
    'font-inter uppercase text-xs tracking-widest',
    isWinter ? 'text-cyan-300/70' : 'text-muted-foreground'
  );

  const valueClasses = cn(VALUE_CLASSES, isWinter ? 'text-cyan-50' : 'text-foreground');
  const sos = sosDisplay(team, isWinter);

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCell label="Record" labelClasses={labelClasses}>
        <div className={cn(valueClasses, 'flex items-center')}>
          <Trophy size={14} className={isWinter ? 'text-cyan-400 mr-1' : 'text-emerald-500 mr-1'} />{' '}
          {team.wins || 0}
          <span className="mx-1">-</span>
          <X size={14} className="text-rose-500 mr-1" /> {team.losses || 0}
        </div>
      </StatCell>

      <StatCell label="Power Score" labelClasses={labelClasses}>
        <span
          className={cn(
            VALUE_CLASSES,
            isWinter ? 'text-cyan-300' : getPowerScoreColor(team.power_score)
          )}
        >
          {formatPowerScore(team.power_score)}
        </span>
      </StatCell>

      {team.sos !== undefined && (
        <StatCell label="SOS" labelClasses={labelClasses}>
          <span className={cn(VALUE_CLASSES, sos.className)}>{sos.text}</span>
        </StatCell>
      )}
    </div>
  );
};
