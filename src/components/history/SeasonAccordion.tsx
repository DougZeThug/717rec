import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Crown, Pencil, RefreshCw, TrendingUp, Trophy } from 'lucide-react';
import React, { useState } from 'react';

import { TeamLogo } from '@/components/shared/TeamLogo';
import { Button } from '@/components/ui/button';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { SeasonService } from '@/services/SeasonService';
import { getHistoryDivisionDisplayName, sortHistoryDivisions } from '@/utils/historyDivisionUtils';
import { dbLog } from '@/utils/logger';

import DivisionPanel from './DivisionPanel';
import EditModeContainer from './editing/EditModeContainer';
import SeasonAccordionSkeleton from './SeasonAccordionSkeleton';
import SeasonMetaBar from './SeasonMetaBar';
import { SeasonData, useSeasonAccordionViewModel } from './useSeasonAccordionViewModel';

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}
interface Highlights {
  mostWins: SeasonData;
  highestPS: SeasonData;
  mostGameWins: SeasonData;
}

const useSeasonData = (seasonId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['season-data', seasonId],
    queryFn: async () => {
      dbLog(`Season ${seasonId}: Starting season data query...`);
      const transformedData = (await SeasonService.fetchSeasonStatsForAccordion(
        seasonId
      )) as SeasonData[];
      dbLog(`Season ${seasonId}: Transformed ${transformedData.length} team records`);
      return transformedData;
    },
    enabled,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000,
  });

interface SeasonAccordionHeaderProps {
  season: Season;
  dateRange: string | null;
  hasChampions: boolean;
  teamCount: number;
  matchCount: number;
  isLoading: boolean;
  isWinterTheme: boolean;
}
const SeasonAccordionHeader: React.FC<SeasonAccordionHeaderProps> = ({
  season,
  dateRange,
  hasChampions,
  teamCount,
  matchCount,
  isLoading,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'px-3 pt-3 pb-2 md:px-6 md:pt-5 md:pb-4',
      isWinterTheme ? 'border-b border-white/10' : 'border-b border-border'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <h3
          className={cn(
            'text-lg md:text-xl font-bebas uppercase tracking-wide leading-tight',
            isWinterTheme ? 'text-white' : 'text-foreground'
          )}
        >
          {season.name}
        </h3>
        {dateRange && (
          <span
            className={cn(
              'text-xs font-inter shrink-0',
              isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
            )}
          >
            {dateRange}
          </span>
        )}
      </div>
      {season.is_active ? (
        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium shrink-0">
          Active
        </span>
      ) : hasChampions ? (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
            isWinterTheme
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
          )}
        >
          🏆 Completed
        </span>
      ) : null}
    </div>
    {!isLoading && (teamCount > 0 || matchCount > 0) && (
      <p
        className={cn(
          'text-[11px] mt-0.5',
          isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
        )}
      >
        {teamCount > 0 && `${teamCount} teams`}
        {teamCount > 0 && matchCount > 0 && ' · '}
        {matchCount > 0 && `${matchCount} matches`}
      </p>
    )}
  </div>
);

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
      <Crown className="w-3 h-3 inline mr-1 -mt-0.5" />
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
      <TrendingUp className="w-3 h-3 inline mr-1 -mt-0.5" />
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
      <div className="animate-pulse flex gap-3">
        <div className="flex-1 h-16 rounded-lg bg-muted/50" />
        <div className="flex-1 h-16 rounded-lg bg-muted/50" />
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

interface SeasonAccordionExpandedContentProps {
  isLoading: boolean;
  error: Error | null;
  season: Season;
  seasonData?: SeasonData[];
  isEditMode: boolean;
  setIsEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  refetch: () => Promise<unknown>;
  isRefetching: boolean;
  divisionData: Record<string, SeasonData[]>;
  isAdminAccessGranted: boolean;
  isWinterTheme: boolean;
}
const SeasonAccordionExpandedContent: React.FC<SeasonAccordionExpandedContentProps> = ({
  isLoading,
  error,
  season,
  seasonData,
  isEditMode,
  setIsEditMode,
  isSaving,
  setIsSaving,
  refetch,
  isRefetching,
  divisionData,
  isAdminAccessGranted,
  isWinterTheme,
}) => (
  <div
    className={cn(
      'p-3 md:p-4 lg:p-6 border-t',
      isWinterTheme ? 'border-white/10' : 'border-border'
    )}
  >
    {isLoading ? (
      <SeasonAccordionSkeleton />
    ) : error ? (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <Trophy className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load season data</p>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <Button
            onClick={() => refetch()}
            disabled={isRefetching}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Retrying...' : 'Try Again'}
          </Button>
        </div>
      </div>
    ) : season.is_active && (!seasonData || seasonData.length === 0) ? (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p>Season in progress – check back later</p>
      </div>
    ) : isEditMode ? (
      <EditModeContainer
        seasonId={season.id}
        seasonData={seasonData || []}
        onSave={async () => {
          setIsSaving(true);
          try {
            await refetch();
            setIsEditMode(false);
          } finally {
            setIsSaving(false);
          }
        }}
        onCancel={() => setIsEditMode(false)}
        isSaving={isSaving}
      />
    ) : (
      <div className="space-y-3 md:space-y-6">
        {isAdminAccessGranted && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="gap-2"
            >
              <Pencil className="w-4 h-4" />
              Edit Divisions
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-6">
          {sortHistoryDivisions(Object.entries(divisionData)).map(([divisionName, teams]) => (
            <DivisionPanel key={divisionName} divisionName={divisionName} teams={teams} />
          ))}
        </div>
        <div className="hidden md:block">
          <SeasonMetaBar season={season} seasonData={seasonData || []} />
        </div>
      </div>
    )}
  </div>
);

const SeasonAccordion: React.FC<{ season: Season }> = ({ season }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const {
    data: seasonData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useSeasonData(season.id, true);
  const { isWinterTheme } = useSeasonalThemeBase();
  const { isAdminAccessGranted } = useAdminAccess();
  const {
    divisionData,
    teamCount,
    matchCount,
    championTeams,
    hasChampions,
    highlights,
    formatDateRange,
  } = useSeasonAccordionViewModel(season, seasonData);

  return (
    <div
      className={cn(
        'rounded-xl shadow-md overflow-hidden border',
        isWinterTheme
          ? 'frost-card winter-card-surface border-[hsla(199,60%,50%,0.2)]'
          : 'bg-card border-border'
      )}
    >
      <SeasonAccordionHeader
        season={season}
        dateRange={formatDateRange()}
        hasChampions={hasChampions}
        teamCount={teamCount}
        matchCount={matchCount}
        isLoading={isLoading}
        isWinterTheme={isWinterTheme}
      />
      <SeasonAccordionSummary
        isLoading={isLoading}
        seasonData={seasonData}
        championTeams={championTeams}
        highlights={highlights}
        isWinterTheme={isWinterTheme}
      />
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-3 py-2 md:px-6 md:py-3 flex items-center justify-center gap-1.5',
          'text-xs font-semibold uppercase tracking-wider transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isWinterTheme
            ? 'text-white/60 hover:text-white/80 hover:bg-white/5 border-t border-white/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border'
        )}
        aria-expanded={isExpanded}
      >
        Full Season Recap
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <SeasonAccordionExpandedContent
              isLoading={isLoading}
              error={error as Error | null}
              season={season}
              seasonData={seasonData}
              isEditMode={isEditMode}
              setIsEditMode={setIsEditMode}
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              refetch={refetch}
              isRefetching={isRefetching}
              divisionData={divisionData}
              isAdminAccessGranted={isAdminAccessGranted}
              isWinterTheme={isWinterTheme}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(SeasonAccordion);
