import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Crown, Pencil, RefreshCw, Target, Trophy, TrendingUp } from 'lucide-react';
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
    staleTime: 0,
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

  // Group data by division
  const divisionData = React.useMemo(() => {
    if (!seasonData) return {};
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
  const championTeams = seasonData?.filter((team) => team.champion) || [];

  const teamCount =
    seasonData?.filter((team) => {
      const displayDivision = getHistoryDivisionDisplayName(team.division_name);
      return !displayDivision.toLowerCase().startsWith('hidden');
    }).length || 0;
  const totalMatches =
    seasonData?.reduce((sum, t) => sum + (t.match_wins || 0) + (t.match_losses || 0), 0) || 0;
  const matchCount = Math.floor(totalMatches / 2);

  // Highlights
  const highlights = React.useMemo(() => {
    if (!seasonData || seasonData.length === 0) return null;
    const mostWins = seasonData.reduce(
      (max, team) => (team.match_wins > max.match_wins ? team : max),
      seasonData[0]
    );
    const highestPS = seasonData.reduce(
      (max, team) => ((team.power_score || 0) > (max.power_score || 0) ? team : max),
      seasonData[0]
    );
    const mostGameWins = seasonData.reduce(
      (max, team) => (team.game_wins > max.game_wins ? team : max),
      seasonData[0]
    );
    return { mostWins, highestPS, mostGameWins };
  }, [seasonData]);

  const formatDateRange = () => {
    if (!season.start_date) return null;
    const startMonth = format(new Date(season.start_date), 'MMM yyyy');
    if (season.end_date) {
      const endMonth = format(new Date(season.end_date), 'MMM yyyy');
      return startMonth === endMonth ? startMonth : `${startMonth} – ${endMonth}`;
    }
    return startMonth;
  };

  const dateRange = formatDateRange();

  return (
    <div
      className={cn(
        'rounded-xl shadow-md overflow-hidden border',
        isWinterTheme
          ? 'frost-card winter-card-surface border-[hsla(199,60%,50%,0.2)]'
          : 'bg-card border-border'
      )}
    >
      {/* ── Header: Season name / date / status ── */}
      <div
        className={cn(
          'px-3 pt-3 pb-2 md:px-6 md:pt-5 md:pb-4',
          isWinterTheme
            ? 'border-b border-white/10'
            : 'border-b border-border'
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
        {/* Team/match meta */}
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

      {/* ── Summary: Champions (left) + Highlights (right) ── */}
      {isLoading ? (
        <div className="px-3 py-4 md:px-6">
          <div className="animate-pulse flex gap-3">
            <div className="flex-1 h-16 rounded-lg bg-muted/50" />
            <div className="flex-1 h-16 rounded-lg bg-muted/50" />
          </div>
        </div>
      ) : seasonData && seasonData.length > 0 ? (
        <div className="px-3 py-2.5 md:px-6 md:py-4">
          <div className="grid grid-cols-2 gap-2 md:gap-4">
            {/* Champions box */}
            <div
              className={cn(
                'rounded-lg p-2.5 md:p-3',
                isWinterTheme
                  ? 'bg-white/5 border border-white/10'
                  : 'bg-muted/50 border border-border'
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
                          {champ.division_name ? ` · ${getHistoryDivisionDisplayName(champ.division_name)}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className={cn(
                    'text-xs italic',
                    isWinterTheme ? 'text-white/40' : 'text-muted-foreground'
                  )}
                >
                  No champion
                </p>
              )}
            </div>

            {/* Highlights box */}
            <div
              className={cn(
                'rounded-lg p-2.5 md:p-3',
                isWinterTheme
                  ? 'bg-white/5 border border-white/10'
                  : 'bg-muted/50 border border-border'
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
                  className={cn(
                    'text-xs italic',
                    isWinterTheme ? 'text-white/40' : 'text-muted-foreground'
                  )}
                >
                  No data yet
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Full Season Recap toggle ── */}
      <button
        onClick={handleToggle}
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

      {/* ── Expanded content ── */}
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
                    <p className="text-sm text-muted-foreground mb-4">
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

                  <div className="hidden md:block">
                    <SeasonMetaBar season={season} seasonData={seasonData || []} />
                  </div>
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
