import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import { PercentileBadge } from '@/components/ui/PercentileBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLeaguePercentiles } from '@/hooks/useLeaguePercentiles';
import { cn } from '@/lib/utils';
import { CareerRanking } from '@/types/career';
import { getPowerScoreColor, getSosColor } from '@/utils/colors';
import { getChampionshipColor, getRunnerUpColor } from '@/utils/colors/championshipColors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';

import { CareerSortOptions } from './CareerRankingsTable';

interface CareerRankingsDesktopViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
  showHidden?: boolean;
}

const CareerRankingsDesktopView: React.FC<CareerRankingsDesktopViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
  showHidden = false,
}) => {
  const { getTeamPercentiles } = useLeaguePercentiles();
  const getSortIcon = (field: string) => {
    if (sortOptions.field !== field) return null;
    return sortOptions.direction === 'desc' ? (
      <ArrowDown className="inline h-4 w-4 ml-1" />
    ) : (
      <ArrowUp className="inline h-4 w-4 ml-1" />
    );
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead className="min-w-[200px]">Team</TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerMatchWins')}
            >
              Career Record {getSortIcon('careerMatchWins')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerWinPercentage')}
            >
              Win % {getSortIcon('careerWinPercentage')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerGameWins')}
            >
              Game Record {getSortIcon('careerGameWins')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerGameWinPercentage')}
            >
              Game Win % {getSortIcon('careerGameWinPercentage')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerPlayoffWins')}
            >
              Playoff Record {getSortIcon('careerPlayoffWins')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('championships')}
            >
              Championships {getSortIcon('championships')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('runnerUps')}
            >
              Runner-ups {getSortIcon('runnerUps')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerPowerScore')}
            >
              Career Power Score {getSortIcon('careerPowerScore')}
            </TableHead>
            <TableHead
              className="cursor-pointer hover:bg-muted/50 text-center"
              onClick={() => onSortChange('careerSos')}
            >
              Career SOS {getSortIcon('careerSos')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <TableRow
              key={ranking.teamId}
              className={cn(
                'hover:bg-muted/50',
                ranking.divisionName === 'Hidden'
                  ? 'bg-muted/30 border-l-4 border-l-muted-foreground'
                  : ''
              )}
            >
              <TableCell className="text-center font-medium">{index + 1}</TableCell>
              <TableCell>
                <Link
                  to={`/teams/${ranking.teamId}`}
                  className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                  onClick={(e) => e.stopPropagation()}
                >
                  {ranking.imageUrl && (
                    <img
                      src={ranking.imageUrl}
                      alt={`${ranking.teamName} logo`}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ranking.teamName}
                    </span>
                    {showHidden && ranking.divisionName === 'Hidden' && (
                      <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full border">
                        Hidden
                      </span>
                    )}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerMatchWins}-{ranking.careerMatchLosses}
              </TableCell>
              <TableCell
                className={cn('text-center', getWinPercentageColor(ranking.careerWinPercentage))}
              >
                <div className="flex items-center justify-center gap-1.5">
                  {formatPercentage(ranking.careerWinPercentage)}
                  {getTeamPercentiles(ranking.teamId)?.winPercentage && (
                    <PercentileBadge
                      percentile={getTeamPercentiles(ranking.teamId)!.winPercentage.percentile}
                      rank={getTeamPercentiles(ranking.teamId)!.winPercentage.rank}
                      total={getTeamPercentiles(ranking.teamId)!.winPercentage.total}
                      size="xs"
                      statName="Win %"
                    />
                  )}
                </div>
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
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={cn(
                      'font-bold px-2 py-1 rounded text-sm',
                      getPowerScoreColor(ranking.careerPowerScore)
                    )}
                  >
                    {ranking.careerPowerScore.toFixed(1)}
                  </span>
                  {getTeamPercentiles(ranking.teamId)?.powerScore && (
                    <PercentileBadge
                      percentile={getTeamPercentiles(ranking.teamId)!.powerScore.percentile}
                      rank={getTeamPercentiles(ranking.teamId)!.powerScore.rank}
                      total={getTeamPercentiles(ranking.teamId)!.powerScore.total}
                      size="xs"
                      statName="Power Score"
                    />
                  )}
                </div>
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
