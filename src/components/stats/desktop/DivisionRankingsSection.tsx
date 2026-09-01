import React, { useMemo } from 'react';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { useAllTeamBadges } from '@/hooks/useTeamBadges';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { debugLog } from '@/utils/logger';
import type { RankingSortField } from '@/utils/rankingUtils';

import RankingTableRow from '../RankingTableRow';
import { SortableColumnHeader } from '../SortableColumnHeader';
import { SortOptions } from '../types';

interface DivisionRankingsSectionProps {
  divisionName: string;
  rankings: Ranking[];
  allRankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: RankingSortField) => void;
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
              {/* Not sortable: the number in this column IS the current sort
                  position, so there is nothing of its own to sort by. The career
                  rankings table has always treated "#" the same way. */}
              <TableHead className={cn('w-12 font-medium', headerTextColor)} scope="col">
                #
              </TableHead>
              <SortableColumnHeader
                field="teamName"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                align="left"
                className={cn('transition-colors', headerTextColor)}
              >
                Team
              </SortableColumnHeader>
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
              <SortableColumnHeader
                field="powerScore"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center', headerTextColor)}
              >
                Power
              </SortableColumnHeader>
              <SortableColumnHeader
                field="wins"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center', headerTextColor)}
              >
                W-L
              </SortableColumnHeader>
              <SortableColumnHeader
                field="winPercentage"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center', headerTextColor)}
              >
                Win %
              </SortableColumnHeader>
              <SortableColumnHeader
                field="gamesWon"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center hidden md:table-cell', headerTextColor)}
              >
                Games
              </SortableColumnHeader>
              <SortableColumnHeader
                field="gameWinPercentage"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center hidden lg:table-cell', headerTextColor)}
              >
                Game %
              </SortableColumnHeader>
              <SortableColumnHeader
                field="sos"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center', headerTextColor)}
              >
                SOS
              </SortableColumnHeader>
              <SortableColumnHeader
                field="streak"
                activeField={sortOptions.field}
                direction={sortOptions.direction}
                onSort={onSortChange}
                className={cn('text-center', headerTextColor)}
              >
                Streak
              </SortableColumnHeader>
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
