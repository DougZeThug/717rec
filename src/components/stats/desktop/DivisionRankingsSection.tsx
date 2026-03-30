import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useMemo } from 'react';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAllTeamBadges } from '@/hooks/useTeamBadges';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { debugLog } from '@/utils/logger';

import { SortOptions } from '../RankingsTable';
import RankingTableRow from '../RankingTableRow';

interface DivisionRankingsSectionProps {
  divisionName: string;
  rankings: Ranking[];
  allRankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
  isLight: boolean;
}

const DivisionRankingsSection: React.FC<DivisionRankingsSectionProps> = ({
  divisionName,
  rankings,
  allRankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false,
  isLight,
}) => {
  const { isWinterTheme } = useSeasonalTheme();
  const { data: allBadges } = useAllTeamBadges();

  // Create a lookup map for badges by team_id
  const badgesByTeam = useMemo(() => {
    if (!allBadges) return new Map();
    const map = new Map<string, typeof allBadges>();
    for (const badge of allBadges) {
      const existing = map.get(badge.team_id) || [];
      existing.push(badge);
      map.set(badge.team_id, existing);
    }
    return map;
  }, [allBadges]);

  const getSortIndicator = (field: string) => {
    if (sortOptions.field !== field) return null;
    return sortOptions.direction === 'asc' ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  // Get aria-sort value for table headers
  const getAriaSort = (field: string): 'ascending' | 'descending' | 'none' => {
    if (sortOptions.field !== field) return 'none';
    return sortOptions.direction === 'asc' ? 'ascending' : 'descending';
  };

  // Use the rankings as-is since divisionRank is already calculated correctly in RankingsTable.tsx
  const rankedDivisionTeams = rankings;

  // Add debug logging for each team's rank change
  React.useEffect(() => {
    // Log all teams' rank changes to help debugging
    debugLog(
      `Desktop ${divisionName} rankings trends:`,
      rankings.map((r) => ({
        team: r.teamName,
        rankChange: r.rankChange !== undefined ? r.rankChange : 'undefined',
        previousRank: r.previousRank !== undefined ? r.previousRank : 'undefined',
      }))
    );
  }, [divisionName, rankings]);

  // Get division-specific gradient
  const getDivisionGradient = () => {
    if (isWinterTheme) {
      return 'bg-gradient-to-r from-frost-primary/10 to-transparent';
    }
    const divName = divisionName.toLowerCase();
    if (divName.includes('competitive')) {
      return isLight
        ? 'bg-gradient-to-r from-amber-50/50 to-transparent'
        : 'bg-gradient-to-r from-amber-900/10 to-transparent';
    }
    if (divName.includes('intermediate')) {
      return isLight
        ? 'bg-gradient-to-r from-blue-50/50 to-transparent'
        : 'bg-gradient-to-r from-blue-900/10 to-transparent';
    }
    if (divName.includes('recreational')) {
      return isLight
        ? 'bg-gradient-to-r from-green-50/50 to-transparent'
        : 'bg-gradient-to-r from-green-900/10 to-transparent';
    }
    return isLight
      ? 'bg-gradient-to-r from-gray-50/70 to-transparent'
      : 'bg-gradient-to-r from-gray-800/30 to-transparent';
  };

  // Header text color based on theme
  const headerTextColor = isWinterTheme
    ? 'text-card-foreground hover:text-frost-primary'
    : 'text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white';

  return (
    <div className="mb-6 sm:mb-8">
      <h2
        className={cn(
          'mb-3 sm:mb-4 text-xl font-bold font-bebas tracking-widest',
          'pl-3 py-1',
          isWinterTheme
            ? 'border-l-4 border-frost-primary text-card-foreground'
            : 'border-l-4 border-blue-500 dark:border-blue-700/80',
          getDivisionGradient(),
          !isWinterTheme && (isLight ? 'text-gray-900' : 'text-white')
        )}
      >
        {divisionName}
      </h2>
      <div
        className={cn(
          'overflow-auto rounded-lg border shadow-sm',
          isWinterTheme
            ? 'border-frost-border/30 winter-card-surface'
            : 'border-blue-200/50 dark:border-blue-800/30 dark:bg-gray-800/50'
        )}
      >
        <Table>
          <TableHeader
            className={cn(
              isWinterTheme
                ? 'bg-frost-primary/10 border-b border-frost-border/30'
                : isLight
                  ? 'bg-gradient-to-r from-blue-50/80 to-blue-100/30 border-b border-blue-200/50'
                  : 'bg-gradient-to-r from-blue-900/10 to-gray-800/60 border-b border-blue-900/30'
            )}
          >
            <TableRow>
              <TableHead
                className={cn('w-12 transition-colors cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('rank')}
                aria-sort={getAriaSort('rank')}
                scope="col"
              >
                # {getSortIndicator('rank')}
              </TableHead>
              <TableHead
                className={cn('transition-colors cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('teamName')}
                aria-sort={getAriaSort('teamName')}
                scope="col"
              >
                Team {getSortIndicator('teamName')}
              </TableHead>
              {showUnified && (
                <TableHead
                  className={cn(
                    'font-medium',
                    isWinterTheme ? 'text-card-foreground' : 'text-gray-700 dark:text-gray-200'
                  )}
                  scope="col"
                >
                  Division
                </TableHead>
              )}
              <TableHead
                className={cn('text-center cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('powerScore')}
                aria-sort={getAriaSort('powerScore')}
                scope="col"
              >
                Power {getSortIndicator('powerScore')}
              </TableHead>
              <TableHead
                className={cn('text-center cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('wins')}
                aria-sort={getAriaSort('wins')}
                scope="col"
              >
                W-L {getSortIndicator('wins')}
              </TableHead>
              <TableHead
                className={cn('text-center cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('winPercentage')}
                aria-sort={getAriaSort('winPercentage')}
                scope="col"
              >
                Win % {getSortIndicator('winPercentage')}
              </TableHead>
              <TableHead
                className={cn(
                  'text-center hidden md:table-cell cursor-pointer font-medium',
                  headerTextColor
                )}
                onClick={() => onSortChange('gamesWon')}
                aria-sort={getAriaSort('gamesWon')}
                scope="col"
              >
                Games {getSortIndicator('gamesWon')}
              </TableHead>
              <TableHead
                className={cn(
                  'text-center hidden lg:table-cell cursor-pointer font-medium',
                  headerTextColor
                )}
                onClick={() => onSortChange('gameWinPercentage')}
                aria-sort={getAriaSort('gameWinPercentage')}
                scope="col"
              >
                Game % {getSortIndicator('gameWinPercentage')}
              </TableHead>
              <TableHead
                className={cn('text-center cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('sos')}
                aria-sort={getAriaSort('sos')}
                scope="col"
              >
                SOS {getSortIndicator('sos')}
              </TableHead>
              <TableHead
                className={cn('text-center cursor-pointer font-medium', headerTextColor)}
                onClick={() => onSortChange('streak')}
                aria-sort={getAriaSort('streak')}
                scope="col"
              >
                Streak {getSortIndicator('streak')}
              </TableHead>
              <TableHead
                className={cn(
                  'text-center font-medium',
                  isWinterTheme ? 'text-card-foreground' : 'text-gray-700 dark:text-gray-200'
                )}
                scope="col"
              >
                Trend
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody
            className={
              isWinterTheme ? '' : isLight ? 'bg-gradient-to-br from-white to-gray-50/50' : ''
            }
          >
            {rankedDivisionTeams.map((ranking, index) => {
              // Always use the global ranking index from allRankings, regardless of view mode
              const globalIndex = allRankings.findIndex((r) => r.teamId === ranking.teamId);

              return (
                <RankingTableRow
                  key={ranking.teamId}
                  ranking={ranking}
                  index={globalIndex}
                  isExpanded={expandedTeam === ranking.teamId}
                  onToggleExpand={() => toggleExpand(ranking.teamId)}
                  showDivision={showUnified}
                  rowIndex={index}
                  prefetchedBadges={badgesByTeam.get(ranking.teamId) || []}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DivisionRankingsSection;
