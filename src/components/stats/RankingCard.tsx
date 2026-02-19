import { Scale } from 'lucide-react';
import React, { useMemo } from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { EntityCard } from '@/components/ui/entity-card';
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
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  showRankChange = true,
  expandedTeam,
  onToggleExpand,
  compactView = false,
  showDivision = false,
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
        className={cn('ranking-card p-3 cursor-pointer')}
        onClick={handleToggleExpand}
        withGradient={false}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold whitespace-nowrap text-foreground">
              {formatRankDisplay()}
            </span>
            {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
          </div>
          <TeamBadgeCollection teamId={ranking.teamId} size="sm" maxDisplay={2} />
        </div>

        <Link
          to={`/teams/${toTeamSlug(ranking.teamName)}`}
          state={{ from: '/stats', scrollPosition: window.scrollY }}
          aria-label={`View ${ranking.teamName} team details`}
          className="flex items-center gap-2 mt-2 group"
        >
          <TeamLogo
            imageUrl={ranking.imageUrl || ranking.logoUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold transition-colors truncate text-foreground group-hover:text-primary">
              {ranking.teamName}
            </h3>
            {showDivision && ranking.divisionName && (
              <p className="text-xs text-muted-foreground">{ranking.divisionName}</p>
            )}
          </div>
        </Link>

        <div className="flex justify-between mt-2 text-xs">
          <span className="tabular-nums text-muted-foreground">
            {ranking.wins}-{ranking.losses}
          </span>
          <span className={cn('font-medium tabular-nums', getPowerScoreColor(ranking.powerScore))}>
            {formatPowerScore(ranking.powerScore)}
          </span>
        </div>

        {isExpanded && (
          <div
            className={cn(
              'mt-3 pt-3 border-t',
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
    <EntityCard className="ranking-card p-4" withGradient={false}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold whitespace-nowrap text-foreground">
            {formatRankDisplay()}
          </span>
          {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
        </div>
        <TeamBadgeCollection teamId={ranking.teamId} size="sm" maxDisplay={3} />
      </div>

      <Link
        to={`/teams/${toTeamSlug(ranking.teamName)}`}
        state={{ from: '/stats', scrollPosition: window.scrollY }}
        aria-label={`View ${ranking.teamName} team details`}
        className="flex items-center gap-3 mb-4 group"
      >
        <TeamLogo
          imageUrl={ranking.imageUrl || ranking.logoUrl}
          teamName={ranking.teamName}
          size="md"
          className="flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className="font-semibold transition-colors truncate text-foreground group-hover:text-primary">
            {ranking.teamName}
          </h3>
          <p className="text-sm text-muted-foreground">{ranking.divisionName}</p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium text-muted-foreground">Record</p>
          <p className="font-bold tabular-nums text-foreground">
            {ranking.wins}-{ranking.losses}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Win %</p>
          <p className={cn('font-bold tabular-nums', winPercentageColorClass)}>
            {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Games</p>
          <p className="font-bold tabular-nums text-foreground">
            {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Game %</p>
          <p className={cn('font-bold tabular-nums', gameWinPercentageColorClass)}>
            {gameWinPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">Power</p>
          <p className={cn('font-bold tabular-nums', getPowerScoreColor(ranking.powerScore))}>
            {formatPowerScore(ranking.powerScore)}
          </p>
        </div>
        <div>
          <p className="font-medium text-muted-foreground">SOS</p>
          <p className={cn('font-bold tabular-nums', getSosColor(ranking.sos || 0))}>
            {(ranking.sos || 0).toFixed(3)}
          </p>
        </div>
      </div>
    </EntityCard>
  );
};

export default RankingCard;
