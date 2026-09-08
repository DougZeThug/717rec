import React from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { EntityCard } from '@/components/ui/entity-card';
import { PowerScoreGauge } from '@/components/ui/power-score-gauge';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { getSosColor } from '@/utils/colors';
import { getStandingsPercentageColor } from '@/utils/colors/standingsColors';
import { formatRankDisplay } from '@/utils/standings/rankLabels';
import { toTeamSlug } from '@/utils/teamSlug';

import { RankingCardCompact } from './RankingCardCompact';
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
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const hasGames = ranking.wins + ranking.losses > 0;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;
  const isExpanded = expandedTeam === ranking.teamId;

  // A team with no games played has no rate worth colouring.
  const winPercentageColorClass = hasGames
    ? getStandingsPercentageColor(winPercentage)
    : 'text-muted-foreground';
  const gameWinPercentageColorClass = getStandingsPercentageColor(gameWinPercentage);

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(ranking.teamId);
    }
  };

  if (compactView) {
    return (
      <RankingCardCompact
        ranking={ranking}
        globalRank={globalRank}
        showRankChange={showRankChange}
        showDivision={showDivision}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        prefetchedBadges={prefetchedBadges}
      />
    );
  }

  return (
    <EntityCard className="ranking-card p-3" withGradient={false}>
      {/* Top row: Rank + trend left, badges right */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold whitespace-nowrap text-foreground">
            {formatRankDisplay(globalRank, divisionRank, showDivision)}
          </span>
          {showRankChange && <RankTrendIndicator rankChange={ranking.rankChange} />}
        </div>
        <TeamBadgeCollection
          teamId={ranking.teamId}
          size="sm"
          maxDisplay={3}
          prefetchedBadges={prefetchedBadges}
        />
      </div>

      {/* Team row: logo + name + division */}
      <div className="flex items-center justify-between mb-2">
        <Link
          to={`/teams/${toTeamSlug(ranking.teamName)}`}
          state={{ from: '/stats' }}
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
            <p className="text-xs text-muted-foreground leading-tight">Games</p>
            <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
              {ranking.gamesWon}-{ranking.gamesLost}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-xs text-muted-foreground leading-tight">Win %</p>
            <p
              className={cn(
                'text-sm font-bold tabular-nums leading-tight',
                winPercentageColorClass
              )}
            >
              {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-xs text-muted-foreground leading-tight">SOS</p>
            <p
              className={cn(
                'text-sm font-bold tabular-nums leading-tight',
                getSosColor(ranking.sos || 0)
              )}
            >
              {(ranking.sos || 0).toFixed(3)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-xs text-muted-foreground leading-tight">Game %</p>
            <p
              className={cn(
                'text-sm font-bold tabular-nums leading-tight',
                gameWinPercentageColorClass
              )}
            >
              {gameWinPercentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </EntityCard>
  );
};

export default RankingCard;
