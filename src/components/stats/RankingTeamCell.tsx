import { Scale } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import type { TeamBadgeEvent } from '@/types/badges';
import { toTeamSlug } from '@/utils/teamSlug';

interface RankingTeamCellProps {
  teamId: string;
  teamName: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  textColor: string;
  prefetchedBadges?: TeamBadgeEvent[];
}

/** Stop a click on a link inside the row from also toggling the row. */
const stopRowToggle = (event: React.MouseEvent) => event.stopPropagation();

/** The team column of a standings row: logo, name, badges, and Compare. */
export const RankingTeamCell: React.FC<RankingTeamCellProps> = ({
  teamId,
  teamName,
  imageUrl,
  logoUrl,
  textColor,
  prefetchedBadges,
}) => {
  const { isWinterTheme } = useSeasonalTheme();

  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        to={`/teams/${toTeamSlug(teamName)}`}
        state={{ from: '/stats' }}
        aria-label={`View ${teamName} team details`}
        className={cn(
          'flex items-center gap-3 transition-colors group flex-1 min-w-0',
          isWinterTheme
            ? 'hover:text-frost-primary'
            : 'hover:text-blue-600 dark:hover:text-blue-400'
        )}
        onClick={stopRowToggle}
      >
        <TeamLogo
          imageUrl={imageUrl || logoUrl}
          teamName={teamName}
          size="sm"
          className="flex-shrink-0"
        />
        <div className="flex flex-col min-w-0">
          <span
            className={cn(
              'font-medium truncate',
              textColor,
              isWinterTheme
                ? 'group-hover:text-frost-primary'
                : 'group-hover:text-blue-600 dark:group-hover:text-blue-400'
            )}
          >
            {teamName}
          </span>
          <TeamBadgeCollection
            teamId={teamId}
            size="sm"
            maxDisplay={4}
            className="mt-1"
            prefetchedBadges={prefetchedBadges}
          />
        </div>
      </Link>
      {/* Render the compare control as a single anchor styled like a ghost
          icon button. `asChild` avoids an invalid <a><button> nesting and
          ensures the accessible name (aria-label) lands on the rendered
          element — an icon-only <button> would otherwise have no name and
          fail axe `button-name` (WCAG 4.1.2). */}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className={cn(
          'size-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
          isWinterTheme && 'hover:bg-frost-primary/10'
        )}
      >
        <Link
          to={`/compare?team1=${teamId}`}
          aria-label={`Compare ${teamName} with another team`}
          onClick={stopRowToggle}
        >
          <Scale className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
};
