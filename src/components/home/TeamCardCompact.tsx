import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { blueAmberHeading } from '@/styles/design-system/blueAmber';
import { Team } from '@/types';

import { TeamLogo } from './TeamLogo';

interface TeamCardCompactProps {
  team: Team;
  rank: number;
  isWinter?: boolean;
}

const TeamCardCompact: React.FC<TeamCardCompactProps> = React.memo(({ team, rank, isWinter = false }) => {
  return (
    <Link
      to={`/teams/${team.id}`}
      className={cn(
        'relative flex flex-col items-center p-3 rounded-lg',
        'border border-border/50',
        'shadow-sm hover:shadow-md transition-shadow',
        'min-w-[120px] max-w-[140px]',
        'active:scale-[0.98]',
        isWinter
          ? 'frost-card frost-edge'
          : cn(
              'bg-gradient-to-br from-white via-white to-gray-50',
              'dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900'
            )
      )}
    >
      {/* Rank badge */}
      <div
        className={cn(
          'absolute -top-2 -left-1 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm',
          isWinter ? 'bg-cyan-500' : 'bg-blue-600 dark:bg-blue-500'
        )}
      >
        #{rank}
      </div>

      {/* Logo */}
      <div className="w-14 h-14 relative flex items-center justify-center mb-2 [&_img]:max-h-12 [&_img]:max-w-12">
        <TeamLogo imageUrl={team.imageUrl} teamName={team.name} />
      </div>

      {/* Team name */}
      <h3
        className={cn(
          'font-bebas text-sm uppercase tracking-wide text-center truncate w-full',
          isWinter ? 'text-cyan-100' : blueAmberHeading()
        )}
      >
        {team.name}
      </h3>

      {/* Record */}
      <div
        className={cn(
          'text-xs mt-1 tabular-nums',
          isWinter ? 'text-cyan-300/70' : 'text-muted-foreground'
        )}
      >
        {team.wins}-{team.losses}
      </div>
    </Link>
  );
});

TeamCardCompact.displayName = 'TeamCardCompact';

export default TeamCardCompact;
