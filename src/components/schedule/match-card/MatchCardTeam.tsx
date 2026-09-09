import React from 'react';

import { TransitionLink } from '@/components/transitions/TransitionLink';
import { TeamLogo } from '@/components/ui/team';
import { cn } from '@/lib/utils';
import { toTeamSlug } from '@/utils/teamSlug';

// The winner used to be marked by emerald text alone, which says nothing in
// greyscale or to a screen reader. Add the word as well, and keep the colour.
// Static, so it is built once rather than on every render.
const winnerTag = (
  <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-full">
    Won
  </span>
);

interface MatchCardTeamProps {
  teamId: string;
  teamName: string;
  logoUrl: string;
  isWinner: boolean;
}

/**
 * One side of a card: logo, name, and the winner tag.
 *
 * Both teams render through this, so the two sides cannot drift apart.
 */
export const MatchCardTeam: React.FC<MatchCardTeamProps> = ({
  teamId,
  teamName,
  logoUrl,
  isWinner,
}) => {
  const slug = `/teams/${toTeamSlug(teamName)}`;

  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <TransitionLink to={slug} className="hover:opacity-80 transition-opacity">
        <TeamLogo imageUrl={logoUrl} teamName={teamName} teamId={teamId} size="md" />
      </TransitionLink>
      <TransitionLink to={slug} className="flex flex-col items-center gap-0.5 min-w-0">
        <span
          className={cn(
            'text-xs font-medium truncate max-w-[120px] text-center',
            isWinner ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-foreground'
          )}
        >
          {teamName}
        </span>
      </TransitionLink>
      {isWinner && winnerTag}
    </div>
  );
};
