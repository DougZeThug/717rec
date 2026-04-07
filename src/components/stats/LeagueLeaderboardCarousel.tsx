import React, { useMemo } from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Card, CardContent } from '@/components/ui/card';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor } from '@/utils/colors';
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

const LeagueLeaderboardCarousel: React.FC<LeagueLeaderboardCarouselProps> = ({ rankings }) => {
  const { isWinterTheme } = useSeasonalTheme();

  const top3 = useMemo(
    () => [...rankings].sort((a, b) => b.powerScore - a.powerScore).slice(0, 3),
    [rankings]
  );

  if (top3.length === 0) return null;

  return (
    <Card className={cn('mb-3 border shadow-sm', isWinterTheme ? 'winter-card-surface' : '')}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          {/* Left: Title */}
          <div className="flex flex-col flex-shrink-0 pt-1">
            <span className="text-sm font-semibold text-foreground leading-tight">League</span>
            <span className="text-sm font-semibold text-foreground leading-tight">Leaderboard</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {rankings.length} teams
            </span>
          </div>

          {/* Right: Top 3 cards */}
          <div className="flex gap-2 flex-1 overflow-x-auto">
            {top3.map((team, idx) => (
              <Link
                key={team.teamId}
                to={`/teams/${toTeamSlug(team.teamName)}`}
                state={{ from: '/stats', scrollPosition: window.scrollY }}
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
                      'absolute -top-2 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
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
                  <p className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-1">
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
