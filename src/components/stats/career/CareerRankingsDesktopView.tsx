import React from 'react';
import { Link } from 'react-router';

import { TeamLogo } from '@/components/shared/TeamLogo';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { CareerRanking } from '@/types/career';
import { getPowerScoreColor, getSosColor } from '@/utils/colors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';
import { formatPowerScore } from '@/utils/powerScore/formatPowerScore';
import { toTeamSlug } from '@/utils/teamSlug';

import { SortableColumnHeader } from '../SortableColumnHeader';
import { CareerSortOptions } from './types';

interface CareerRankingsDesktopViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
}

const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

const rankClasses = (rank: number) => {
  if (rank === 1) return 'text-amber-500';
  if (rank <= 3) return 'text-primary';
  return 'text-muted-foreground';
};

const CareerRankingsDesktopView: React.FC<CareerRankingsDesktopViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
}) => {
  const headerCell = 'text-center px-1.5 whitespace-nowrap';

  return (
    <div className="overflow-x-auto">
      <Table className="w-full table-fixed">
        <TableHeader>
          <TableRow>
            {/* Not sortable: the number in this column is the row's position
                under the current sort, not a value of its own. */}
            <TableHead className="w-10 text-center px-1.5" scope="col">
              #
            </TableHead>
            <TableHead className="w-auto min-w-[150px] px-2" scope="col">
              Team
            </TableHead>
            <SortableColumnHeader
              field="careerPowerScore"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[86px]')}
            >
              Power
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerMatchWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[88px]')}
            >
              Record
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerWinPercentage"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[74px]')}
            >
              Win %
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerGameWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[96px]')}
            >
              Games
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerGameWinPercentage"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[74px]')}
            >
              GW %
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerPlayoffWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[82px]')}
            >
              Playoff
            </SortableColumnHeader>
            <SortableColumnHeader
              field="championships"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[92px]')}
            >
              Titles
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerSos"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className={cn(headerCell, 'w-[76px]')}
            >
              SOS
            </SortableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => {
            const rank = index + 1;
            return (
              <TableRow key={ranking.teamId} className="hover:bg-muted/50">
                <TableCell className={cn('text-center px-1.5 font-bold tabular-nums')}>
                  <span className={rankClasses(rank)}>{rank}</span>
                </TableCell>
                <TableCell className="px-2">
                  <Link
                    to={`/teams/${toTeamSlug(ranking.teamName)}`}
                    className="flex items-center gap-2 min-w-0 group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TeamLogo
                      imageUrl={ranking.imageUrl || ranking.logoUrl}
                      teamName={ranking.teamName}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <span className="font-medium truncate group-hover:text-primary transition-colors">
                      {ranking.teamName}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-center px-1.5">
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      getPowerScoreColor(ranking.careerPowerScore)
                    )}
                  >
                    {formatPowerScore(ranking.careerPowerScore)}
                  </span>
                </TableCell>
                <TableCell className="text-center px-1.5 tabular-nums font-semibold">
                  {ranking.careerMatchWins}-{ranking.careerMatchLosses}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center px-1.5 tabular-nums',
                    getWinPercentageColor(ranking.careerWinPercentage)
                  )}
                >
                  {formatPercentage(ranking.careerWinPercentage)}
                </TableCell>
                <TableCell className="text-center px-1.5 tabular-nums text-muted-foreground">
                  {ranking.careerGameWins}-{ranking.careerGameLosses}
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center px-1.5 tabular-nums',
                    getWinPercentageColor(ranking.careerGameWinPercentage)
                  )}
                >
                  {formatPercentage(ranking.careerGameWinPercentage)}
                </TableCell>
                <TableCell className="text-center px-1.5 tabular-nums text-muted-foreground">
                  {ranking.careerPlayoffWins > 0 || ranking.careerPlayoffLosses > 0
                    ? `${ranking.careerPlayoffWins}-${ranking.careerPlayoffLosses}`
                    : '-'}
                </TableCell>
                <TableCell className="text-center px-1.5 whitespace-nowrap text-sm tabular-nums">
                  {ranking.championships > 0 || ranking.runnerUps > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      {ranking.championships > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          🏆{ranking.championships > 1 ? `×${ranking.championships}` : ''}
                        </span>
                      )}
                      {ranking.runnerUps > 0 && (
                        <span className="text-muted-foreground">
                          🥈{ranking.runnerUps > 1 ? `×${ranking.runnerUps}` : ''}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center px-1.5">
                  <span className={cn('font-mono tabular-nums', getSosColor(ranking.careerSos))}>
                    {ranking.careerSos.toFixed(3)}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default CareerRankingsDesktopView;
