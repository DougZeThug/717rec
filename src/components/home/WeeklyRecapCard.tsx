import { ClipboardList, Flame, TrendingDown, TrendingUp, Zap } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { WeeklyRecapData, WeeklyUpset, TeamStreakInfo } from '@/services/WeeklyRecapService';
import { typeScale } from '@/styles/design-system';
import { WeeklyPowerScoreTrend } from '@/types/powerScoreSnapshot';
import { formatPowerScore } from '@/utils/colors/powerScoreColors';
import { toTeamSlug } from '@/utils/teamSlug';

interface WeeklyRecapCardProps {
  data: WeeklyRecapData;
  /** Pass top risers + top faller from existing trend data */
  risers: WeeklyPowerScoreTrend[];
  faller?: WeeklyPowerScoreTrend;
}

const WeeklyRecapCard: React.FC<WeeklyRecapCardProps> = ({ data, risers, faller }) => {
  const { shouldApplyWinter } = useSeasonalTheme();

  const hasUpsets = data.upsets.length > 0;
  const hasStreaks = data.hotStreaks.length > 0;
  const hasMovers = risers.length > 0 || !!faller;

  if (!hasUpsets && !hasStreaks && !hasMovers) return null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        shouldApplyWinter
          ? 'winter-card-full'
          : 'border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-background to-indigo-500/5'
      )}
    >
      {/* Subtle glow */}
      <div
        className={cn(
          'absolute inset-0 opacity-50',
          shouldApplyWinter
            ? 'bg-gradient-to-r from-cyan-500/5 via-transparent to-violet-500/5'
            : 'bg-gradient-to-r from-violet-500/10 via-transparent to-indigo-500/10'
        )}
      />

      <CardContent className="relative p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList
              size={16}
              className={shouldApplyWinter ? 'text-cyan-400' : 'text-violet-500'}
            />
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                shouldApplyWinter
                  ? 'text-cyan-300'
                  : 'text-violet-600 dark:text-violet-400'
              )}
            >
              Weekly Recap
            </span>
          </div>
          {data.weekNumber !== null && (
            <Badge
              variant={shouldApplyWinter ? 'winter' : 'outline'}
              className={cn('text-xs', !shouldApplyWinter && 'border-muted-foreground/30')}
            >
              Week {data.weekNumber}
            </Badge>
          )}
        </div>

        {/* Upsets */}
        {hasUpsets && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={13} className="text-yellow-500 fill-yellow-500/50" />
              <span className={cn(typeScale.caption, 'font-semibold uppercase tracking-wider text-muted-foreground')}>
                Upsets
              </span>
            </div>
            {data.upsets.map((upset) => (
              <UpsetRow key={upset.winnerId + upset.loserId} upset={upset} winter={shouldApplyWinter} />
            ))}
          </section>
        )}

        {/* Divider between sections */}
        {hasUpsets && (hasStreaks || hasMovers) && (
          <div className="border-t border-border/50" />
        )}

        {/* Hot Streaks */}
        {hasStreaks && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Flame size={13} className="text-orange-500" />
              <span className={cn(typeScale.caption, 'font-semibold uppercase tracking-wider text-muted-foreground')}>
                Hot Streaks
              </span>
            </div>
            {data.hotStreaks.map((team) => (
              <StreakRow key={team.teamId} team={team} winter={shouldApplyWinter} />
            ))}
          </section>
        )}

        {/* Divider */}
        {hasStreaks && hasMovers && (
          <div className="border-t border-border/50" />
        )}

        {/* Movers */}
        {hasMovers && (
          <section className="space-y-2">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={13} className="text-emerald-500" />
              <span className={cn(typeScale.caption, 'font-semibold uppercase tracking-wider text-muted-foreground')}>
                Movers
              </span>
            </div>
            {risers.map((trend) => (
              <MoverRow key={trend.teamId} trend={trend} direction="up" winter={shouldApplyWinter} />
            ))}
            {faller && faller.delta < 0 && (
              <MoverRow trend={faller} direction="down" winter={shouldApplyWinter} />
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface UpsetRowProps {
  upset: WeeklyUpset;
  winter: boolean;
}

const UpsetRow: React.FC<UpsetRowProps> = ({ upset, winter }) => (
  <div className="flex flex-col gap-1">
    {/* Teams row */}
    <div className="flex items-center gap-1.5">
      <Link
        to={`/teams/${toTeamSlug(upset.winnerName)}`}
        className="flex items-center gap-1.5 group min-w-0"
      >
        <TeamLogo imageUrl={upset.winnerLogoUrl} teamName={upset.winnerName} size="xs" />
        <span
          className={cn(
            typeScale.body,
            'font-medium truncate transition-colors',
            winter ? 'text-cyan-50 group-hover:text-cyan-300' : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
          )}
        >
          {upset.winnerName}
        </span>
      </Link>

      <span className="text-muted-foreground/60 text-xs shrink-0">def.</span>

      <Link
        to={`/teams/${toTeamSlug(upset.loserName)}`}
        className="flex items-center gap-1.5 group min-w-0"
      >
        <TeamLogo imageUrl={upset.loserLogoUrl} teamName={upset.loserName} size="xs" />
        <span
          className={cn(
            typeScale.body,
            'truncate transition-colors',
            winter ? 'text-cyan-100/70 group-hover:text-cyan-300' : 'text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400'
          )}
        >
          {upset.loserName}
        </span>
      </Link>
    </div>

    {/* Score + badge row */}
    <div className="flex items-center gap-1.5 pl-6">
      {upset.matchResult && (
        <span className="text-xs tabular-nums text-muted-foreground">{upset.matchResult}</span>
      )}
      <Badge variant="outline" className="text-xs border-yellow-500/40 text-yellow-600 dark:text-yellow-400 gap-1">
        <Zap size={10} className="fill-yellow-500/50" />
        Upset +{upset.powerScoreGap.toFixed(1)}
      </Badge>
    </div>
  </div>
);

interface StreakRowProps {
  team: TeamStreakInfo;
  winter: boolean;
}

const StreakRow: React.FC<StreakRowProps> = ({ team, winter }) => (
  <Link to={`/teams/${toTeamSlug(team.teamName)}`} className="flex items-center gap-2 group">
    <TeamLogo imageUrl={team.logoUrl} teamName={team.teamName} size="xs" />
    <div className="flex-1 min-w-0">
      <span
        className={cn(
          typeScale.body,
          'font-medium truncate transition-colors block',
          winter ? 'text-cyan-50 group-hover:text-cyan-300' : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
        )}
      >
        {team.teamName}
      </span>
      <span className={cn(typeScale.caption, 'text-muted-foreground truncate block')}>
        {team.division}
      </span>
    </div>
    <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs tabular-nums">
      <Flame size={10} />
      {team.streak}
    </Badge>
  </Link>
);

interface MoverRowProps {
  trend: WeeklyPowerScoreTrend;
  direction: 'up' | 'down';
  winter: boolean;
}

const MoverRow: React.FC<MoverRowProps> = ({ trend, direction, winter }) => {
  const isUp = direction === 'up';

  return (
    <Link to={`/teams/${toTeamSlug(trend.teamName)}`} className="flex items-center gap-2 group">
      <TeamLogo imageUrl={trend.logoUrl} teamName={trend.teamName} size="xs" />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            typeScale.body,
            'font-medium truncate transition-colors block',
            winter
              ? 'text-cyan-50 group-hover:text-cyan-300'
              : 'group-hover:text-violet-600 dark:group-hover:text-violet-400'
          )}
        >
          {trend.teamName}
        </span>
        <span className={cn(typeScale.caption, 'text-muted-foreground tabular-nums block')}>
          {formatPowerScore(trend.previousScore)} → {formatPowerScore(trend.currentScore)}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isUp ? (
          <TrendingUp size={14} className="text-emerald-500" />
        ) : (
          <TrendingDown size={14} className="text-red-500" />
        )}
        <span
          className={cn(
            'text-sm font-semibold tabular-nums',
            isUp ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {isUp ? '+' : ''}{trend.delta.toFixed(1)}
        </span>
      </div>
    </Link>
  );
};

export default WeeklyRecapCard;
