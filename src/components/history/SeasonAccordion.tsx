import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, ChevronDown, Crown, Pencil, RefreshCw, Trophy, Users } from 'lucide-react';
import React, { useState } from 'react';

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

interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  playoff_rank: number | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

const useSeasonData = (seasonId: string, enabled: boolean) => {
  return useQuery({
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
    staleTime: 0, // Always refetch - important for admin edits
    retry: 2,
    retryDelay: 1000,
  });
};

interface SeasonAccordionProps {
  season: Season;
}

const SeasonAccordion: React.FC<SeasonAccordionProps> = ({ season }) => {
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

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Group data by division with proper display names and ordering
  // Uses rank-based splitting for Intermediate division -> Int 1 / Int 2
  const divisionData = React.useMemo(() => {
    if (!seasonData) return {};

    // Filter out Hidden divisions and group by display division name
    const grouped = seasonData
      .filter((team) => {
        const displayDivision = getHistoryDivisionDisplayName(team.division_name);
        return !displayDivision.toLowerCase().startsWith('hidden');
      })
      .reduce(
        (acc, team) => {
          const displayDivision = getHistoryDivisionDisplayName(team.division_name);
          if (!acc[displayDivision]) {
            acc[displayDivision] = [];
          }
          acc[displayDivision].push(team);
          return acc;
        },
        {} as Record<string, SeasonData[]>
      );

    return grouped;
  }, [seasonData, season.name]);

  const hasChampions = seasonData?.some((team) => team.champion) || false;

  // Get champion names for preview
  const champions = seasonData?.filter((team) => team.champion).map((team) => team.team_name) || [];

  // Count total teams and matches
  const teamCount =
    seasonData?.filter((team) => {
      const displayDivision = getHistoryDivisionDisplayName(team.division_name);
      return !displayDivision.toLowerCase().startsWith('hidden');
    }).length || 0;
  const totalMatches =
    seasonData?.reduce((sum, t) => sum + (t.match_wins || 0) + (t.match_losses || 0), 0) || 0;
  const matchCount = Math.floor(totalMatches / 2); // Each match counted twice (once per team)

  // Format date range
  const formatDateRange = () => {
    if (!season.start_date) return null;
    const startMonth = format(new Date(season.start_date), 'MMM yyyy');
    if (season.end_date) {
      const endMonth = format(new Date(season.end_date), 'MMM yyyy');
      return startMonth === endMonth ? startMonth : `${startMonth} - ${endMonth}`;
    }
    return startMonth;
  };

  const dateRange = formatDateRange();

  return (
    <div
      className={cn(
        'rounded-2xl shadow-lg overflow-hidden border',
        isWinterTheme
          ? 'frost-card winter-card-surface border-[hsla(199,60%,50%,0.2)]'
          : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
      )}
    >
      <button
        onClick={handleToggle}
        className={cn(
          'w-full px-3 py-3 md:p-6 text-left transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isWinterTheme
            ? cn('hover:bg-white/5', isExpanded && 'bg-white/5')
            : cn(
                'hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-amber-50/30',
                'dark:hover:from-slate-700/50 dark:hover:to-slate-700/30',
                isExpanded &&
                  'bg-gradient-to-r from-blue-50/30 to-amber-50/20 dark:from-slate-700/40 dark:to-slate-700/20'
              )
        )}
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Trophy circle — desktop only */}
            <div
              className={cn(
                'hidden md:flex w-10 h-10 rounded-full items-center justify-center shrink-0',
                isWinterTheme
                  ? hasChampions
                    ? 'bg-gradient-to-br from-yellow-500/30 to-amber-500/20'
                    : 'bg-white/10'
                  : hasChampions
                    ? 'bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-800/40'
                    : 'bg-gray-100 dark:bg-gray-700'
              )}
            >
              <Trophy
                className={cn(
                  'w-5 h-5',
                  hasChampions ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400'
                )}
              />
            </div>
            <div className="min-w-0 space-y-0.5 md:space-y-1">
              {/* Row 1: Season name + date + status badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    'text-lg md:text-xl font-bebas uppercase tracking-wide leading-tight',
                    isWinterTheme ? 'text-white' : 'text-slate-900 dark:text-white'
                  )}
                >
                  {season.name}
                </h3>
                {dateRange && (
                  <span
                    className={cn(
                      'text-xs font-inter',
                      isWinterTheme ? 'text-white/60' : 'text-muted-foreground'
                    )}
                  >
                    ({dateRange})
                  </span>
                )}
                {season.is_active ? (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                    Active
                  </span>
                ) : hasChampions ? (
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      isWinterTheme
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    🏆 Completed
                  </span>
                ) : null}
              </div>

              {/* Row 2: Champion names */}
              {isLoading ? (
                <span className="text-muted-foreground text-xs animate-pulse">•••</span>
              ) : (
                <>
                  {champions.length > 0 && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 truncate">
                      👑 {champions.join(', ')}
                    </p>
                  )}
                  {/* Row 3: Team count · Match count */}
                  {(teamCount > 0 || matchCount > 0) && (
                    <p
                      className={cn(
                        'text-xs',
                        isWinterTheme ? 'text-white/50' : 'text-muted-foreground'
                      )}
                    >
                      {teamCount > 0 && `${teamCount} teams`}
                      {teamCount > 0 && matchCount > 0 && ' · '}
                      {matchCount > 0 && `${matchCount} matches`}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              'w-5 h-5 shrink-0 mt-1 transition-transform duration-200',
              isWinterTheme ? 'text-white/50' : 'text-muted-foreground',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
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
            <div
              className={cn(
                'p-4 md:p-6 pt-0 border-t',
                isWinterTheme ? 'border-white/10' : 'border-gray-200 dark:border-slate-600'
              )}
            >
              {isLoading ? (
                <SeasonAccordionSkeleton />
              ) : error ? (
                <div className="text-center py-8">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <Trophy className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">Failed to load season data</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
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
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>Season in progress – check back later</p>
                </div>
              ) : isEditMode ? (
                <EditModeContainer
                  seasonId={season.id}
                  seasonData={seasonData || []}
                  onSave={async () => {
                    setIsSaving(true);
                    try {
                      // Wait for fresh data before closing edit mode
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
                <div className="space-y-6">
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

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {sortHistoryDivisions(Object.entries(divisionData)).map(
                      ([divisionName, teams]) => (
                        <DivisionPanel
                          key={divisionName}
                          divisionName={divisionName}
                          teams={teams}
                        />
                      )
                    )}
                  </div>

                  <SeasonMetaBar season={season} seasonData={seasonData || []} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(SeasonAccordion);
