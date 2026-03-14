import { ChevronRight, Star, TrendingUp } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SeasonalIcon } from '@/components/ui/seasonal-icon';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { SnowflakeSparkle } from '@/icons';
import { cn } from '@/lib/utils';
import { typeScale } from '@/styles/design-system';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { formatPowerScore } from '@/utils/colors/powerScoreColors';
import { toTeamSlug } from '@/utils/teamSlug';

interface TeamOfTheWeekCardProps {
  trend: WeeklyPowerScoreTrend;
  weekNumber: number;
}

const TeamOfTheWeekCard: React.FC<TeamOfTheWeekCardProps> = ({ trend, weekNumber }) => {
  const { shouldApplyWinter } = useSeasonalTheme();

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        shouldApplyWinter
          ? 'team-of-week-card winter-card-full'
          : 'border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background to-orange-500/5'
      )}
      style={{ minHeight: '140px', contain: 'layout style' }}
    >
      {/* Subtle glow effect */}
      <div
        className={cn(
          'absolute inset-0 opacity-50',
          shouldApplyWinter
            ? 'bg-gradient-to-r from-cyan-500/5 via-transparent to-amber-500/5'
            : 'bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10'
        )}
      />

      <CardContent className="relative p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SeasonalIcon
              defaultIcon={Star}
              winterIcon={SnowflakeSparkle}
              size={16}
              className={
                shouldApplyWinter ? 'text-cyan-400 animate-pulse' : 'text-amber-500 fill-amber-500'
              }
            />
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                shouldApplyWinter ? 'text-cyan-300' : 'text-amber-600 dark:text-amber-400'
              )}
            >
              Team of the Week
            </span>
          </div>
          <Badge
            variant={shouldApplyWinter ? 'winter' : 'outline'}
            className={cn('text-xs', !shouldApplyWinter && 'border-muted-foreground/30')}
          >
            {shouldApplyWinter && <SnowflakeSparkle size={12} className="mr-1" />}
            Week {weekNumber}
          </Badge>
        </div>

        <Link to={`/teams/${toTeamSlug(trend.teamName)}`} className="group block">
          <div className="flex items-center gap-4 md:gap-6">
            {/* Team Logo with glow */}
            <div className="relative flex-shrink-0">
              <div
                className={cn(
                  'absolute inset-0 rounded-full blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                  shouldApplyWinter ? 'bg-cyan-400/20' : 'bg-amber-500/20'
                )}
              />
              <TeamLogo
                imageUrl={trend.logoUrl}
                teamName={trend.teamName}
                size="lg"
                rounded
                className={cn(
                  'relative z-10 transition-all duration-300 !w-16 !h-16 !min-w-16 !min-h-16',
                  shouldApplyWinter
                    ? 'ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/50'
                    : 'ring-2 ring-amber-500/20 group-hover:ring-amber-500/40'
                )}
              />
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h3
                className={cn(
                  typeScale.h2,
                  'transition-colors truncate',
                  shouldApplyWinter
                    ? 'text-cyan-50 group-hover:text-cyan-300'
                    : 'text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400'
                )}
              >
                {trend.teamName}
              </h3>
              <Badge
                variant={shouldApplyWinter ? 'winterAccent' : 'secondary'}
                className={typeScale.caption}
              >
                {trend.division}
              </Badge>
            </div>

            {/* Power Score Delta */}
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-lg md:text-xl font-bold tabular-nums text-emerald-500">
                  +{trend.delta.toFixed(1)}
                </span>
              </div>
              <span
                className={cn(
                  typeScale.caption,
                  'tabular-nums',
                  shouldApplyWinter && 'text-cyan-200/70'
                )}
              >
                {formatPowerScore(trend.previousScore)} → {formatPowerScore(trend.currentScore)}
              </span>
              <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400">
                +{trend.percentChange.toFixed(1)}%
              </span>
            </div>

            {/* Arrow */}
            <ChevronRight
              className={cn(
                'h-5 w-5 group-hover:translate-x-1 transition-all duration-200 hidden md:block',
                shouldApplyWinter
                  ? 'text-cyan-400/50 group-hover:text-cyan-400'
                  : 'text-muted-foreground/50 group-hover:text-amber-500'
              )}
            />
          </div>
        </Link>
      </CardContent>
    </Card>
  );
};

export default TeamOfTheWeekCard;
