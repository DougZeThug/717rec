import { Scale } from 'lucide-react';

import React, { useMemo } from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { EntityCard } from '@/components/ui/entity-card';
import { PowerScoreGauge } from '@/components/ui/power-score-gauge';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { formatPowerScore, getPowerScoreColor, getSosColor } from '@/utils/colors';
import { toTeamSlug } from '@/utils/teamSlug';

import RankTrendIndicator from './RankTrendIndicator';

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  expandedTeam?: string | null;
  onToggleExpand?: (teamId: string) => void;
  compactView?: boolean;
  showDivision?: boolean;
  prefetchedBadges?: import('@/types/badges').TeamBadgeEvent[];
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  showRankChange = true,
  expandedTeam,
  onToggleExpand,
  compactView = false,
  showDivision = false,
  prefetchedBadges,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const hasGames = ranking.wins + ranking.losses > 0;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;
  const isExpanded = expandedTeam === ranking.teamId;

  // Memoize win percentage color calculation
  const winPercentageColorClass = useMemo(() => {
    if (!hasGames) return 'text-muted-foreground';
    if (winPercentage >= 75) return 'text-green-600 dark:text-green-500';
    if (winPercentage >= 60) return 'text-blue-600 dark:text-blue-500';
    if (winPercentage >= 40) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-600 dark:text-red-500';
  }, [hasGames, winPercentage]);

  // Memoize game win percentage color calculation
  const gameWinPercentageColorClass = useMemo(() => {
    if (gameWinPercentage >= 75) return 'text-green-600 dark:text-green-500';
    if (gameWinPercentage >= 60) return 'text-blue-600 dark:text-blue-500';
    if (gameWinPercentage >= 40) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-600 dark:text-red-500';
  }, [gameWinPercentage]);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(ranking.teamId);
    }
  };

  // Format rank display based on view mode
  const formatRankDisplay = () => {
    if (showDivision) {
      return `#${globalRank}`;
    } else {
      if (divisionRank) {
        return `#${divisionRank} (${globalRank})`;
      }
      return `#${globalRank}`;
    }
  };

  if (compactView) {
    return (
      <EntityCard
        className={cn('ranking-card p-2.5 cursor-pointer')}
        onClick={handleToggleExpand}
        withGradient={false}
      >
        <div className="flex items-center gap-2">
          {/* Rank column */}
          <div className="flex flex-col items-center w-7 flex-shrink-0">
            <span className="text-sm font-bold tabular-nums text-foreground">
              {showDivision ? globalRank : (divisionRank || globalRank)}
            </span>
            {showRankChange && (
              <div className="scale-90">
                <RankTrendIndicator rankChange={ranking.rankChange} />
              </div>
            )}
          </div>

          {/* Team logo + name + record */}
          <Link
            to={`/teams/${toTeamSlug(ranking.teamName)}`}
            state={{ from: '/stats', scrollPosition: window.scrollY }}
            aria-label={`View ${ranking.teamName} team details`}
            className="flex items-center gap-2 flex-1 min-w-0 group"
            onClick={(e) => e.stopPropagation()}
          >
            <TeamLogo
              imageUrl={ranking.imageUrl || ranking.logoUrl}
              teamName={ranking.teamName}
              size="sm"
              className="flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-tight text-foreground group-hover:text-primary transition-colors">
                {ranking.teamName}
              </h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {ranking.wins}-{ranking.losses}
                {showDivision && ranking.divisionName && (
                  <span className="ml-1.5">· {ranking.divisionName}</span>
                )}
              </p>
            </div>
          </Link>

          {/* Badges */}
          <div className="flex-shrink-0">
            <TeamBadgeCollection teamId={ranking.teamId} size="sm" maxDisplay={1} />
          </div>

          {/* Power score - always right-aligned */}
          <div className="flex flex-col items-end flex-shrink-0 w-16">
            <span className="text-[10px] text-muted-foreground leading-tight">Power</span>
            <span className={cn('text-base font-bold tabular-nums leading-tight', getPowerScoreColor(ranking.powerScore))}>
              {formatPowerScore(ranking.powerScore)}
            </span>
          </div>
        </div>

        {isExpanded && (
          <div
            className={cn(
              'mt-2.5 pt-2.5 border-t',
              isWinterTheme ? 'border-frost-border/30' : 'border-border'
            )}
          >
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div>
                <p className="text-muted-foreground">Win %</p>
                <p className={cn('font-bold tabular-nums', winPercentageColorClass)}>
                  {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">SOS</p>
                <p className={cn('font-bold tabular-nums', getSosColor(ranking.sos || 0))}>
                  {(ranking.sos || 0).toFixed(3)}
                </p>
              </div>
            </div>
            <Link to={`/compare?team1=${ranking.teamId}`}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <Scale className="h-3 w-3 mr-1" />
                Compare Team
              </Button>
            </Link>
          </div>
        )}
      </EntityCard>
    );
  }

  return (
    <EntityCard className="ranking-card p-3" withGradient={false}>
      {/* Top row: Rank + trend left, badges right */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold whitespace-nowrap text-foreground">
            {formatRankDisplay()}
          </span>
          {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
        </div>
        <TeamBadgeCollection teamId={ranking.teamId} size="sm" maxDisplay={3} />
      </div>

      {/* Team row: logo + name + division */}
      <div className="flex items-center justify-between mb-2">
        <Link
          to={`/teams/${toTeamSlug(ranking.teamName)}`}
          state={{ from: '/stats', scrollPosition: window.scrollY }}
          aria-label={`View ${ranking.teamName} team details`}
          className="flex items-center gap-2 min-w-0 group"
        >
          <TeamLogo
            imageUrl={ranking.imageUrl || ranking.logoUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm transition-colors truncate text-foreground group-hover:text-primary">
              {ranking.teamName}
            </h3>
            <p className="text-xs text-muted-foreground">{ranking.divisionName}</p>
          </div>
        </Link>
        <span className="text-base font-bold tabular-nums text-foreground flex-shrink-0">
          {ranking.wins}-{ranking.losses}
        </span>
      </div>

      {/* Stats section: Power gauge left, 2x2 grid right */}
      <div className="flex items-center gap-3">
        {/* Power Score Gauge */}
        <div className="flex-shrink-0">
          <PowerScoreGauge score={ranking.powerScore} size="md" showLabel />
        </div>

        {/* 2x2 stat grid */}
        <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Games</p>
            <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
              {ranking.gamesWon}-{ranking.gamesLost}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Win %</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', winPercentageColorClass)}>
              {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">SOS</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', getSosColor(ranking.sos || 0))}>
              {(ranking.sos || 0).toFixed(3)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Game %</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', gameWinPercentageColorClass)}>
              {gameWinPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </EntityCard>
  );
};

export default RankingCard;
