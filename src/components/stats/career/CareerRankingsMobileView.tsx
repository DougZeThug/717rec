import { ArrowDown, ArrowUp, Bolt, Scale } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { EntityCard } from '@/components/ui/entity-card';
import { PowerScoreGauge } from '@/components/ui/power-score-gauge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { CareerRanking } from '@/types/career';
import { getPowerScoreColor, getSosColor } from '@/utils/colors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';
import { formatPowerScore } from '@/utils/powerScore/formatPowerScore';
import { toTeamSlug } from '@/utils/teamSlug';

import { CareerSortOptions } from './CareerRankingsTable';

interface CareerRankingsMobileViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
}

const CareerRankingsMobileView: React.FC<CareerRankingsMobileViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const [detailedView, setDetailedView] = useState(() => {
    const saved = localStorage.getItem('careerRankingsDetailedView');
    return saved ? saved === 'true' : false;
  });

  const toggleViewMode = (value: string) => {
    if (!value) return;
    const isDetailed = value === 'detailed';
    setDetailedView(isDetailed);
    localStorage.setItem('careerRankingsDetailedView', String(isDetailed));
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const gameWinPercentageColorClass = (pct: number) => {
    const val = pct * 100;
    if (val >= 75) return 'text-green-600 dark:text-green-500';
    if (val >= 60) return 'text-blue-600 dark:text-blue-500';
    if (val >= 40) return 'text-orange-500 dark:text-orange-400';
    return 'text-red-600 dark:text-red-500';
  };

  const sortableFields = useMemo(
    () => [
      {
        id: 'careerPowerScore',
        label: (
          <>
            <Bolt size={16} className="inline-block mr-1" />
            Power
          </>
        ),
      },
      { id: 'careerWinPercentage', label: 'Win %' },
      {
        id: 'careerSos',
        label: (
          <>
            <Scale size={15} className="inline-block mr-1" />
            SOS
          </>
        ),
      },
      { id: 'championships', label: '🏆 Titles' },
    ],
    []
  );

  return (
    <div className="font-inter">
      {/* Controls row: Compact/Detailed toggle */}
      <div className="mb-2 flex items-center justify-end">
        <ToggleGroup
          type="single"
          value={detailedView ? 'detailed' : 'compact'}
          onValueChange={toggleViewMode}
          className="border border-border rounded-lg p-0.5"
        >
          <ToggleGroupItem
            value="compact"
            className={cn(
              'text-xs px-2.5 py-1 rounded-md transition-all',
              !detailedView
                ? 'bg-cornhole-navy text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Compact
          </ToggleGroupItem>
          <ToggleGroupItem
            value="detailed"
            className={cn(
              'text-xs px-2.5 py-1 rounded-md transition-all',
              detailedView
                ? 'bg-cornhole-navy text-white shadow-sm'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            Detailed
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Sort pills - only visible in detailed view */}
      {detailedView && (
        <div className="mb-2">
          <div className="overflow-x-auto pb-1.5 touch-pan-x -mx-1 px-1">
            <div className="flex space-x-2">
              {sortableFields.map((field) => (
                <Button
                  key={field.id}
                  variant={sortOptions.field === field.id ? 'blueOrange' : 'outline'}
                  size="sm"
                  onClick={() => onSortChange(field.id)}
                  className={cn(
                    'rounded-lg py-2 px-3 text-xs font-medium transition-all whitespace-nowrap min-h-[36px]',
                    isWinterTheme &&
                      (sortOptions.field === field.id
                        ? 'btn-winter-primary'
                        : 'btn-winter-secondary'),
                    !isWinterTheme &&
                      sortOptions.field !== field.id &&
                      'bg-card hover:bg-accent/50 text-foreground border-border'
                  )}
                >
                  {field.label}
                  {sortOptions.field === field.id &&
                    (sortOptions.direction === 'asc' ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rankings list */}
      <div className="space-y-1.5">
        {rankings.map((ranking, index) =>
          detailedView ? (
            <CareerDetailedCard key={ranking.teamId} ranking={ranking} rank={index + 1} formatPercentage={formatPercentage} gameWinPercentageColorClass={gameWinPercentageColorClass} />
          ) : (
            <CareerCompactCard key={ranking.teamId} ranking={ranking} rank={index + 1} formatPercentage={formatPercentage} />
          )
        )}
      </div>
    </div>
  );
};

// Compact card - mirrors standings compact design
const CareerCompactCard: React.FC<{
  ranking: CareerRanking;
  rank: number;
  formatPercentage: (v: number) => string;
}> = ({ ranking, rank, formatPercentage }) => {
  return (
    <EntityCard className="ranking-card p-2.5" withGradient={false}>
      <div className="flex items-center gap-2">
        {/* Rank */}
        <div className="flex flex-col items-center w-7 flex-shrink-0">
          <span className="text-sm font-bold tabular-nums text-foreground">{rank}</span>
        </div>

        {/* Team logo + name + record */}
        <Link
          to={`/teams/${toTeamSlug(ranking.teamName)}`}
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
              <span className="font-bold">{ranking.careerMatchWins}-{ranking.careerMatchLosses}</span>
              <span className={cn('ml-1', getWinPercentageColor(ranking.careerWinPercentage))}>
                ({formatPercentage(ranking.careerWinPercentage)})
              </span>
            </p>
          </div>
        </Link>

        {/* Championship trophies */}
        {ranking.championships > 0 && (
          <div className="flex-shrink-0 text-xs">
            <span>🏆</span>
            {ranking.championships > 1 && (
              <span className="text-amber-600 dark:text-amber-400 font-bold ml-0.5">
                ×{ranking.championships}
              </span>
            )}
          </div>
        )}

        {/* Power score - right-aligned */}
        <div className="flex flex-col items-end flex-shrink-0 w-16">
          <span className="text-[10px] text-muted-foreground leading-tight">Power</span>
          <span className={cn('text-base font-bold tabular-nums leading-tight', getPowerScoreColor(ranking.careerPowerScore))}>
            {formatPowerScore(ranking.careerPowerScore)}
          </span>
        </div>
      </div>
    </EntityCard>
  );
};

// Detailed card - mirrors standings detailed design
const CareerDetailedCard: React.FC<{
  ranking: CareerRanking;
  rank: number;
  formatPercentage: (v: number) => string;
  gameWinPercentageColorClass: (pct: number) => string;
}> = ({ ranking, rank, formatPercentage, gameWinPercentageColorClass }) => {
  return (
    <EntityCard className="ranking-card p-3" withGradient={false}>
      {/* Top row: Rank + championship trophies */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold whitespace-nowrap text-foreground">
            #{rank}
          </span>
        </div>
        {ranking.championships > 0 && (
          <div className="flex items-center gap-1 text-sm">
            {Array.from({ length: ranking.championships }).map((_, i) => (
              <span key={i}>🏆</span>
            ))}
            {ranking.runnerUps > 0 && (
              <span className="text-muted-foreground ml-1 text-xs">
                🥈×{ranking.runnerUps}
              </span>
            )}
          </div>
        )}
        {ranking.championships === 0 && ranking.runnerUps > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground text-xs">
              🥈×{ranking.runnerUps}
            </span>
          </div>
        )}
      </div>

      {/* Team row: logo + name + record */}
      <div className="flex items-center justify-between mb-2">
        <Link
          to={`/teams/${toTeamSlug(ranking.teamName)}`}
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
          </div>
        </Link>
        <span className="text-base font-bold tabular-nums text-foreground flex-shrink-0">
          {ranking.careerMatchWins}-{ranking.careerMatchLosses}
        </span>
      </div>

      {/* Stats section: Power gauge left, 2x2 grid right */}
      <div className="flex items-center gap-3">
        {/* Power Score Gauge */}
        <div className="flex-shrink-0">
          <PowerScoreGauge score={ranking.careerPowerScore} size="md" showLabel />
        </div>

        {/* 2x2 stat grid */}
        <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Win %</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', getWinPercentageColor(ranking.careerWinPercentage))}>
              {formatPercentage(ranking.careerWinPercentage)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">SOS</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', getSosColor(ranking.careerSos))}>
              {ranking.careerSos.toFixed(3)}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Games</p>
            <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
              {ranking.careerGameWins}-{ranking.careerGameLosses}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5">
            <p className="text-[10px] text-muted-foreground leading-tight">Game %</p>
            <p className={cn('text-sm font-bold tabular-nums leading-tight', gameWinPercentageColorClass(ranking.careerGameWinPercentage))}>
              {formatPercentage(ranking.careerGameWinPercentage)}
            </p>
          </div>
        </div>
      </div>
    </EntityCard>
  );
};

export default React.memo(CareerRankingsMobileView);
