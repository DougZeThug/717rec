import React from 'react';
import { Link } from 'react-router';

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
import { getChampionshipColor, getRunnerUpColor } from '@/utils/colors/championshipColors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';
import { toTeamSlug } from '@/utils/teamSlug';

import { SortableColumnHeader } from '../SortableColumnHeader';
import { CareerSortOptions } from './types';

interface CareerRankingsDesktopViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
}

const formatPercentage = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

const CareerRankingsDesktopView: React.FC<CareerRankingsDesktopViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Not sortable: the number in this column is the row's position
                under the current sort, not a value of its own. */}
            <TableHead className="w-12 text-center" scope="col">
              #
            </TableHead>
            <TableHead className="min-w-[200px]" scope="col">
              Team
            </TableHead>
            <SortableColumnHeader
              field="careerMatchWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Career Record
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerWinPercentage"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Win %
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerGameWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Game Record
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerGameWinPercentage"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Game Win %
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerPlayoffWins"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Playoff Record
            </SortableColumnHeader>
            <SortableColumnHeader
              field="championships"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Championships
            </SortableColumnHeader>
            <SortableColumnHeader
              field="runnerUps"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Runner-ups
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerPowerScore"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Career Power Score
            </SortableColumnHeader>
            <SortableColumnHeader
              field="careerSos"
              activeField={sortOptions.field}
              direction={sortOptions.direction}
              onSort={onSortChange}
              icon="arrow"
              className="text-center"
            >
              Career SOS
            </SortableColumnHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <TableRow key={ranking.teamId} className="hover:bg-muted/50">
              <TableCell className="text-center font-medium">{index + 1}</TableCell>
              <TableCell>
                <Link
                  to={`/teams/${toTeamSlug(ranking.teamName)}`}
                  className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ranking.imageUrl && (
                    <img
                      src={ranking.imageUrl}
                      alt={`${ranking.teamName} logo`}
                      className="size-8 rounded object-cover"
                    />
                  )}
                  <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {ranking.teamName}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerMatchWins}-{ranking.careerMatchLosses}
              </TableCell>
              <TableCell
                className={cn('text-center', getWinPercentageColor(ranking.careerWinPercentage))}
              >
                {formatPercentage(ranking.careerWinPercentage)}
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerGameWins}-{ranking.careerGameLosses}
              </TableCell>
              <TableCell
                className={cn(
                  'text-center',
                  getWinPercentageColor(ranking.careerGameWinPercentage)
                )}
              >
                {formatPercentage(ranking.careerGameWinPercentage)}
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerPlayoffWins > 0 || ranking.careerPlayoffLosses > 0
                  ? `${ranking.careerPlayoffWins}-${ranking.careerPlayoffLosses}`
                  : '-'}
              </TableCell>
              <TableCell className={cn('text-center', getChampionshipColor(ranking.championships))}>
                {ranking.championships > 0 ? ranking.championships : '-'}
              </TableCell>
              <TableCell className={cn('text-center', getRunnerUpColor(ranking.runnerUps))}>
                {ranking.runnerUps > 0 ? ranking.runnerUps : '-'}
              </TableCell>
              <TableCell className="text-center">
                <span
                  className={cn(
                    'font-bold px-2 py-1 rounded text-sm',
                    getPowerScoreColor(ranking.careerPowerScore)
                  )}
                >
                  {ranking.careerPowerScore.toFixed(1)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <span className={cn('font-mono', getSosColor(ranking.careerSos))}>
                  {ranking.careerSos.toFixed(3)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CareerRankingsDesktopView;
