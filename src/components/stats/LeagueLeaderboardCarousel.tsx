import React, { useMemo } from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor } from '@/utils/colors';
import { sortRankings } from '@/utils/rankingUtils';
import { toTeamSlug } from '@/utils/teamSlug';

interface LeagueLeaderboardCarouselProps {
  rankings: Ranking[];
}

const RANK_STYLES = [
  'border-yellow-500/60 bg-yellow-500/5',
  'border-gray-400/60 bg-gray-400/5',
  'border-amber-700/60 bg-amber-700/5',
];

const BADGE_STYLES = [
  'bg-yellow-500 text-yellow-950',
  'bg-gray-300 text-gray-800',
  'bg-amber-700 text-amber-100',
];

// Below 640px the title is one line above the cards, so the three cards get the
// full width; from 640px it is a column on their left, as before.
const LeaderboardTitle: React.FC<{ teamCount: number }> = ({ teamCount }) => (
  <div className="flex flex-wrap items-baseline gap-x-1 shrink-0 sm:flex-col sm:items-stretch sm:pt-1">
    <span className="text-sm font-semibold text-foreground leading-tight">League</span>
    <span className="text-sm font-semibold text-foreground leading-tight">Leaderboard</span>
    <span className="text-xs text-muted-foreground mt-0.5">{teamCount} teams</span>
  </div>
);

const LeagueLeaderboardCarousel: React.FC<LeagueLeaderboardCarouselProps> = ({ rankings }) => {
  const { isWinterTheme } = useSeasonalTheme();

  const top3 = useMemo(() => sortRankings(rankings, 'powerScore', 'desc').slice(0, 3), [rankings]);

  if (top3.length === 0) return null;

  return (
    <Card className={cn('mb-3 border shadow-xs', isWinterTheme ? 'winter-card-surface' : '')}>
      <CardContent className="p-3">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
          {/* Left: Title */}
          <LeaderboardTitle teamCount={rankings.length} />

          {/* Right: Top 3 cards. Below 640px the padding makes room for the rank
              badges, which sit 6px above and 2px left of their card: the
              scrolling strip cut them off. From 640px it is as before. */}
          <div className="flex gap-2 flex-1 overflow-x-auto pt-1.5 pl-0.5 sm:pt-0 sm:pl-0">
            {top3.map((team, idx) => (
              <Link
                key={team.teamId}
                to={`/teams/${toTeamSlug(team.teamName)}`}
                state={{ from: '/stats' }}
                className="block flex-1 min-w-0"
              >
                <div
                  className={cn(
                    'relative rounded-lg border-2 p-2 flex flex-col items-center gap-1 transition-colors hover:bg-accent/30',
                    RANK_STYLES[idx] || 'border-border bg-card'
                  )}
                >
                  {/* Rank badge */}
                  <div
                    className={cn(
                      'absolute -top-2 -left-1 size-5 rounded-full flex items-center justify-center text-xs font-bold',
                      BADGE_STYLES[idx]
                    )}
                  >
                    {idx + 1}
                  </div>

                  <TeamLogo
                    imageUrl={team.imageUrl || team.logoUrl}
                    teamName={team.teamName}
                    size="sm"
                  />
                  <p
                    title={team.teamName}
                    className="text-xs font-medium text-foreground text-center leading-tight line-clamp-2 break-words"
                  >
                    {team.teamName}
                  </p>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums leading-tight',
                      getPowerScoreColor(team.powerScore)
                    )}
                  >
                    {formatPowerScore(team.powerScore)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(LeagueLeaderboardCarousel);
