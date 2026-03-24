import React, { useMemo } from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor } from '@/utils/colors';
import { toTeamSlug } from '@/utils/teamSlug';

interface LeagueLeaderboardCarouselProps {
  rankings: Ranking[];
}

const LeagueLeaderboardCarousel: React.FC<LeagueLeaderboardCarouselProps> = ({ rankings }) => {
  const { isWinterTheme } = useSeasonalTheme();

  const top3 = useMemo(
    () => [...rankings].sort((a, b) => b.powerScore - a.powerScore).slice(0, 3),
    [rankings]
  );

  if (top3.length === 0) return null;

  return (
    <Card className={cn('mb-3 border shadow-sm', isWinterTheme ? 'winter-card-surface' : '')}>
      <CardHeader className="py-2.5 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            League Leaderboard
          </CardTitle>
          <span className="text-xs text-muted-foreground">{rankings.length} teams</span>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <Carousel opts={{ align: 'start', loop: false }} className="w-full">
          <CarouselContent className="-ml-2">
            {top3.map((team, idx) => (
              <CarouselItem key={team.teamId} className="pl-2 basis-[45%]">
                <Link
                  to={`/teams/${toTeamSlug(team.teamName)}`}
                  state={{ from: '/stats', scrollPosition: window.scrollY }}
                  className="block"
                >
                  <div
                    className={cn(
                      'relative rounded-lg border p-3 flex flex-col items-center gap-1.5 transition-colors hover:bg-accent/30',
                      isWinterTheme ? 'border-frost-border/30 bg-frost-primary/5' : 'border-border bg-card'
                    )}
                  >
                    {/* Rank badge */}
                    <div
                      className={cn(
                        'absolute -top-2 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                        idx === 0
                          ? 'bg-yellow-500 text-yellow-950'
                          : idx === 1
                            ? 'bg-gray-300 text-gray-800'
                            : 'bg-amber-700 text-amber-100'
                      )}
                    >
                      {idx + 1}
                    </div>

                    <TeamLogo
                      imageUrl={team.imageUrl || team.logoUrl}
                      teamName={team.teamName}
                      size="md"
                    />
                    <p className="text-xs font-medium text-foreground text-center leading-tight">
                      {team.teamName}
                    </p>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-muted-foreground">Power Score</span>
                      <span
                        className={cn(
                          'text-lg font-bold tabular-nums leading-tight',
                          getPowerScoreColor(team.powerScore)
                        )}
                      >
                        {formatPowerScore(team.powerScore)}
                      </span>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-3 h-7 w-7" />
          <CarouselNext className="hidden sm:flex -right-3 h-7 w-7" />
        </Carousel>
      </CardContent>
    </Card>
  );
};

export default React.memo(LeagueLeaderboardCarousel);
