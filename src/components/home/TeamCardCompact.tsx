import React from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { blueAmberHeading } from '@/styles/design-system/blueAmber';
import { Team } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

import { TeamLogo } from './TeamLogo';

interface TeamCardCompactProps {
  team: Team;
  rank: number;
  isWinter?: boolean;
}

const TeamCardCompact: React.FC<TeamCardCompactProps> = ({ team, rank, isWinter = false }) => {
  return (
    <Link
      to={`/teams/${toTeamSlug(team.name)}`}
      className={cn(
        'relative flex flex-col items-center p-3 rounded-lg',
        'border border-border/50',
        'shadow-sm hover:shadow-md transition-shadow',
        'min-w-[100px] flex-1',
        'active:scale-[0.98]',
        isWinter
          ? 'frost-card frost-edge'
          : cn(
              'bg-gradient-to-br from-white via-white to-gray-50',
              'dark:from-[#1E1E1E] dark:via-gray-800/90 dark:to-gray-900'
            )
      )}
    >
      {/* Rank badge.

          White on 12px bold needs 4.5:1 for WCAG AA. Measured against white:
          blue-600 5.17, blue-500 3.68, cyan-700 5.36, cyan-600 3.68, cyan-500 2.43.
          So there is no dark-mode override — blue-500 failed — and winter uses
          cyan-700 rather than cyan-500. Do not brighten either back without
          re-checking the ratio; e2e/a11y.spec.ts catches it, intermittently. */}
      <div
        className={cn(
          'absolute -top-2 -left-1 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm',
          isWinter ? 'bg-cyan-700' : 'bg-blue-600'
        )}
      >
        #{rank}
      </div>

      {/* Logo */}
      <div className="size-14 relative flex items-center justify-center mb-2 [&_img]:max-h-12 [&_img]:max-w-12">
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
};

export default TeamCardCompact;
