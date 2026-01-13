import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSeasonalTheme } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { Ranking } from '@/types';
import { getPowerScoreColor } from '@/utils/colors';
import { getSosColor } from '@/utils/colors';

import HeadToHeadRecords from '../HeadToHeadRecords';
import { SortOptions } from '../RankingsTable';

interface DivisionRankingsTableProps {
  rankings: Ranking[];
  allRankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified: boolean;
  isLight: boolean;
}

const DivisionRankingsTable: React.FC<DivisionRankingsTableProps> = ({
  rankings,
  allRankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified,
  isLight,
}) => {
  const { isWinterTheme } = useSeasonalTheme();

  const renderSortIndicator = (field: string) =>
    sortOptions.field === field ? (
      sortOptions.direction === 'asc' ? (
        <ArrowUp className="inline-block ml-1 h-4 w-4" />
      ) : (
        <ArrowDown className="inline-block ml-1 h-4 w-4" />
      )
    ) : null;

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead
      className={cn(
        'cursor-pointer text-sm font-medium font-mono',
        isWinterTheme
          ? 'hover:bg-white/10 text-card-foreground'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-white',
        className
      )}
      onClick={() => onSortChange(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="overflow-x-auto">
      <Table
        className={cn(
          'border rounded-xl shadow-sm',
          isWinterTheme
            ? 'bg-transparent border-frost-border/30 text-card-foreground'
            : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-white border-gray-200 dark:border-gray-700'
        )}
      >
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(
                'w-12 text-sm font-mono font-semibold tracking-wide',
                isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
              )}
            >
              Rank
            </TableHead>
            <TableHead
              className={cn(
                'text-sm font-semibold font-bebas uppercase tracking-wide',
                isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
              )}
            >
              Team
            </TableHead>
            {showUnified && (
              <TableHead
                className={cn(
                  'text-sm font-semibold font-bebas uppercase tracking-wide',
                  isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
                )}
              >
                Division
              </TableHead>
            )}
            <TableHead
              className={cn(
                'text-center text-sm font-medium font-mono',
                isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <span
                  onClick={() => onSortChange('powerScore')}
                  className="cursor-pointer flex items-center"
                >
                  <span className="mr-1 font-mono">Power Score</span>{' '}
                  {renderSortIndicator('powerScore')}
                </span>
              </div>
            </TableHead>
            <SortableHeader field="wins">W-L</SortableHeader>
            <SortableHeader field="winPercentage">Win %</SortableHeader>
            <SortableHeader field="gamesWon" className="hidden md:table-cell">
              Games (W-L)
            </SortableHeader>
            <SortableHeader field="gameWinPercentage" className="hidden lg:table-cell">
              Game %
            </SortableHeader>
            <SortableHeader field="sos" className="hidden lg:table-cell">
              <div className="flex items-center gap-1 justify-center">
                <span>SOS</span>
              </div>
            </SortableHeader>
            <TableHead
              className={cn(
                'hidden md:table-cell text-center text-sm font-medium font-mono',
                isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
              )}
            >
              Streak
            </TableHead>
            <TableHead
              className={cn(
                'hidden md:table-cell text-center text-sm font-medium font-mono',
                isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
              )}
            >
              Trend
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking) => {
            const overallIndex = allRankings.findIndex((r) => r.teamId === ranking.teamId);
            return (
              <React.Fragment key={ranking.teamId}>
                <TableRow className="font-inter">
                  <TableCell className="font-mono font-semibold text-lg">
                    {overallIndex + 1}
                    {!showUnified && ranking.divisionRank && (
                      <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-inter">
                        ({ranking.divisionRank})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      {/** Logo as square with consistent sizing */}
                      {ranking.imageUrl || ranking.logoUrl ? (
                        <div className="w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                          <img
                            src={ranking.imageUrl || ranking.logoUrl}
                            alt={ranking.teamName}
                            className="w-full h-full object-contain"
                            style={{ minWidth: '2rem', minHeight: '2rem' }}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                          N/A
                        </div>
                      )}
                      <span
                        className={cn(
                          'uppercase tracking-wide font-bebas',
                          isWinterTheme ? 'text-card-foreground' : 'text-gray-800 dark:text-white'
                        )}
                        style={{
                          fontFamily: "'Bebas Neue', 'Arial Narrow', Arial, sans-serif",
                          fontSize: '1.1rem',
                          lineHeight: '1.1',
                          letterSpacing: '0.05em',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          textTransform: 'uppercase',
                        }}
                      >
                        {ranking.teamName}
                      </span>
                    </div>
                  </TableCell>
                  {showUnified && (
                    <TableCell>
                      <span className="font-inter">{ranking.divisionName}</span>
                    </TableCell>
                  )}
                  <TableCell className="text-center font-mono font-semibold">
                    <span
                      className={isLight ? '' : getPowerScoreColor(ranking.powerScore)}
                      style={{
                        color: isLight
                          ? ranking.powerScore >= 75
                            ? '#2f855a' // green-600
                            : ranking.powerScore >= 60
                              ? '#3182ce' // blue-500
                              : ranking.powerScore >= 40
                                ? '#dd6b20' // orange-500
                                : '#e53e3e' // red-500
                          : undefined,
                      }}
                    >
                      {ranking.powerScore?.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {ranking.wins}-{ranking.losses}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {(ranking.winPercentage * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center font-mono">
                    {ranking.gamesWon}-{ranking.gamesLost}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center font-mono">
                    {(ranking.gameWinPercentage * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-center font-mono">
                    <span
                      className={isLight ? '' : getSosColor(ranking.sos)}
                      style={{
                        color: isLight
                          ? ranking.sos >= 75
                            ? '#2f855a' // green-600
                            : ranking.sos >= 60
                              ? '#3182ce' // blue-500
                              : ranking.sos >= 40
                                ? '#dd6b20' // orange-500
                                : '#e53e3e' // red-500
                          : undefined,
                      }}
                    >
                      {ranking.sos?.toFixed(3)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <span className="font-mono">{ranking.streak}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    {/* Trend indicator can be added if desired */}
                  </TableCell>
                </TableRow>
                {expandedTeam === ranking.teamId && (
                  <TableRow>
                    <TableCell
                      colSpan={showUnified ? 11 : 10}
                      className={cn(
                        'p-0 rounded-b-xl shadow-inner',
                        isWinterTheme ? 'bg-white/5' : 'bg-gray-100 dark:bg-gray-900/80'
                      )}
                    >
                      <div className="p-4">
                        <HeadToHeadRecords teamId={ranking.teamId} />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default React.memo(DivisionRankingsTable);
