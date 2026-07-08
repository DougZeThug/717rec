import { Crown, TrendingUp } from 'lucide-react';
import React from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getHistoryDivisionDisplayName } from '@/utils/historyDivisionUtils';

import { Highlights } from './seasonAccordionTypes';
import { SeasonData } from './useSeasonAccordionViewModel';

interface ChampionsSummaryCardProps {
  championTeams: SeasonData[];
  isWinterTheme: boolean;
}

const ChampionsSummaryCard: React.FC<ChampionsSummaryCardProps> = ({
  championTeams,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'rounded-lg p-2.5 md:p-3',
      isWinterTheme ? 'bg-white/5 border border-white/10' : 'bg-muted/50 border border-border'
    )}
  >
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider mb-1.5',
        isWinterTheme ? 'text-amber-300/80' : 'text-amber-600 dark:text-amber-400'
      )}
    >
      <Crown className="size-3 inline mr-1 -mt-0.5" />
      Champions
    </p>
    {championTeams.length > 0 ? (
      <div className="space-y-1.5">
        {championTeams.map((champ) => (
          <div key={champ.team_id} className="flex items-center gap-2">
            <TeamLogo
              imageUrl={champ.team_logo_url || champ.team_image_url}
              teamName={champ.team_name}
              size="xs"
              rounded
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-xs font-semibold truncate leading-tight',
                  isWinterTheme ? 'text-white' : 'text-foreground'
                )}
              >
                {champ.team_name}
              </p>
              <p
                className={cn(
                  'text-[10px] leading-tight',
                  isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
                )}
              >
                {champ.match_wins}-{champ.match_losses}
                {champ.division_name
                  ? ` · ${getHistoryDivisionDisplayName(champ.division_name)}`
                  : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p
        className={cn('text-xs italic', isWinterTheme ? 'text-white/40' : 'text-muted-foreground')}
      >
        No champion
      </p>
    )}
  </div>
);

interface HighlightsSummaryCardProps {
  highlights: Highlights | null;
  isWinterTheme: boolean;
}

const HighlightsSummaryCard: React.FC<HighlightsSummaryCardProps> = ({
  highlights,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'rounded-lg p-2.5 md:p-3',
      isWinterTheme ? 'bg-white/5 border border-white/10' : 'bg-muted/50 border border-border'
    )}
  >
    <p
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wider mb-1.5',
        isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
      )}
    >
      <TrendingUp className="size-3 inline mr-1 -mt-0.5" />
      Highlights
    </p>
    {highlights ? (
      <div className="space-y-1">
        <div>
          <p
            className={cn(
              'text-[10px] leading-tight',
              isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
            )}
          >
            Most Wins
          </p>
          <p
            className={cn(
              'text-xs font-semibold truncate leading-tight',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {highlights.mostWins.team_name} ({highlights.mostWins.match_wins})
          </p>
        </div>
        <div>
          <p
            className={cn(
              'text-[10px] leading-tight',
              isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
            )}
          >
            Best Power Score
          </p>
          <p
            className={cn(
              'text-xs font-semibold truncate leading-tight',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {highlights.highestPS.team_name} (
            {highlights.highestPS.power_score
              ? (highlights.highestPS.power_score * 100).toFixed(1)
              : 'N/A'}
            )
          </p>
        </div>
        <div>
          <p
            className={cn(
              'text-[10px] leading-tight',
              isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
            )}
          >
            Most Game Wins
          </p>
          <p
            className={cn(
              'text-xs font-semibold truncate leading-tight',
              isWinterTheme ? 'text-white' : 'text-foreground'
            )}
          >
            {highlights.mostGameWins.team_name} ({highlights.mostGameWins.game_wins})
          </p>
        </div>
      </div>
    ) : (
      <p
        className={cn('text-xs italic', isWinterTheme ? 'text-white/40' : 'text-muted-foreground')}
      >
        No data yet
      </p>
    )}
  </div>
);

interface SeasonAccordionSummaryProps {
  isLoading: boolean;
  seasonData?: SeasonData[];
  championTeams: SeasonData[];
  highlights: Highlights | null;
  isWinterTheme: boolean;
}

const SeasonAccordionSummary: React.FC<SeasonAccordionSummaryProps> = ({
  isLoading,
  seasonData,
  championTeams,
  highlights,
  isWinterTheme,
}) =>
  isLoading ? (
    <div className="px-3 py-4 md:px-6">
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-16 rounded-lg bg-muted/50" />
        <Skeleton className="flex-1 h-16 rounded-lg bg-muted/50" />
      </div>
    </div>
  ) : seasonData && seasonData.length > 0 ? (
    <div className="px-3 py-2.5 md:px-6 md:py-4">
      <div className="grid grid-cols-2 gap-2 md:gap-4">
        <ChampionsSummaryCard championTeams={championTeams} isWinterTheme={isWinterTheme} />
        <HighlightsSummaryCard highlights={highlights} isWinterTheme={isWinterTheme} />
      </div>
    </div>
  ) : null;

export default SeasonAccordionSummary;
