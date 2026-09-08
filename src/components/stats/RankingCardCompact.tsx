import { Scale } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import TeamBadgeCollection from '@/components/badges/TeamBadgeCollection';
import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { EntityCard } from '@/components/ui/entity-card';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import type { TeamBadgeEvent } from '@/types/badges';
import {
  formatPowerScore,
  getPowerScoreColor,
  getPowerScoreDescription,
  getSosColor,
} from '@/utils/colors';
import { getStandingsPercentageColor } from '@/utils/colors/standingsColors';
import { toTeamSlug } from '@/utils/teamSlug';

import RankTrendIndicator from './RankTrendIndicator';

interface RankingCardCompactProps {
  ranking: Ranking;
  globalRank: number;
  showRankChange: boolean;
  showDivision: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  prefetchedBadges?: TeamBadgeEvent[];
}

const stopCardToggle = (event: React.MouseEvent) => event.stopPropagation();

/** The panel that opens under a compact card when it is tapped. */
const ExpandedPanel: React.FC<{ ranking: Ranking }> = ({ ranking }) => {
  const { isWinterTheme } = useSeasonalTheme();
  const hasGames = ranking.wins + ranking.losses > 0;
  const winPercentage = ranking.winPercentage * 100;
  const sos = ranking.sos ?? 0;

  return (
    <div
      className={cn(
        'mt-2.5 pt-2.5 border-t',
        isWinterTheme ? 'border-frost-border/30' : 'border-border'
      )}
    >
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <p className="text-muted-foreground">Win %</p>
          <p
            className={cn(
              'font-bold tabular-nums',
              hasGames ? getStandingsPercentageColor(winPercentage) : 'text-muted-foreground'
            )}
          >
            {hasGames ? `${winPercentage.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">SOS</p>
          <p className={cn('font-bold tabular-nums', getSosColor(sos))}>{sos.toFixed(3)}</p>
        </div>
      </div>
      <Link to={`/compare?team1=${ranking.teamId}`}>
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={stopCardToggle}>
          <Scale className="size-3 mr-1" aria-hidden="true" />
          Compare Team
        </Button>
      </Link>
    </div>
  );
};

/** The one-line standings card a phone shows in Compact view. */
export const RankingCardCompact: React.FC<RankingCardCompactProps> = ({
  ranking,
  globalRank,
  showRankChange,
  showDivision,
  isExpanded,
  onToggleExpand,
  prefetchedBadges,
}) => {
  const powerScoreBand = getPowerScoreDescription(ranking.powerScore);

  return (
    <EntityCard
      className={cn('ranking-card p-2.5 cursor-pointer')}
      onClick={onToggleExpand}
      withGradient={false}
    >
      <div className="flex items-center gap-2">
        {/* Rank column */}
        <div className="flex flex-col items-center w-7 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {showDivision ? globalRank : (ranking.divisionRank ?? globalRank)}
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
          state={{ from: '/stats' }}
          aria-label={`View ${ranking.teamName} team details`}
          className="flex items-center gap-2 flex-1 min-w-0 group"
          onClick={stopCardToggle}
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
          <TeamBadgeCollection
            teamId={ranking.teamId}
            size="sm"
            maxDisplay={1}
            prefetchedBadges={prefetchedBadges}
          />
        </div>

        {/* Power score - always right-aligned */}
        <div className="flex flex-col items-end flex-shrink-0 w-16">
          <span className="text-xs text-muted-foreground leading-tight">Power</span>
          {/* The colour is the only cue for how good the number is, so the
              band it falls in is spelled out for screen readers. */}
          <span
            className={cn(
              'text-base font-bold tabular-nums leading-tight',
              getPowerScoreColor(ranking.powerScore)
            )}
            title={powerScoreBand}
          >
            {formatPowerScore(ranking.powerScore)}
          </span>
          <span className="sr-only">{powerScoreBand}</span>
        </div>
      </div>

      {isExpanded && <ExpandedPanel ranking={ranking} />}
    </EntityCard>
  );
};
