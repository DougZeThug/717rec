import React from 'react';
import { CareerRanking } from '@/types/career';
import { CareerSortOptions } from './CareerRankingsTable';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { getPowerScoreColor } from '@/utils/colors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';
import { getChampionshipColor, getRunnerUpColor } from '@/utils/colors/championshipColors';
import { cn } from '@/lib/utils';

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
  showHidden = false
}) => {
  const getSortIcon = (field: string) => {
    if (sortOptions.field !== field) return null;
    return sortOptions.direction === 'desc' ? 
      <ArrowDown className="inline h-4 w-4 ml-1" /> : 
      <ArrowUp className="inline h-4 w-4 ml-1" />;
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <TableRow key={ranking.teamId} className={cn(
              "hover:bg-muted/50",
              ranking.divisionName === 'Hidden' ? 'bg-muted/30 border-l-4 border-l-muted-foreground' : ''
            )}>
              <TableCell className="text-center font-medium">
                {index + 1}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  {ranking.imageUrl && (
                    <img 
                      src={ranking.imageUrl} 
                      alt={`${ranking.teamName} logo`}
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{ranking.teamName}</span>
                    {showHidden && ranking.divisionName === 'Hidden' && (
                      <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full border">
                        Hidden
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerMatchWins}-{ranking.careerMatchLosses}
              </TableCell>
              <TableCell className={cn("text-center", getWinPercentageColor(ranking.careerWinPercentage))}>
                {formatPercentage(ranking.careerWinPercentage)}
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerGameWins}-{ranking.careerGameLosses}
              </TableCell>
              <TableCell className={cn("text-center", getWinPercentageColor(ranking.careerGameWinPercentage))}>
                {formatPercentage(ranking.careerGameWinPercentage)}
              </TableCell>
              <TableCell className="text-center">
                {ranking.careerPlayoffWins > 0 || ranking.careerPlayoffLosses > 0 
                  ? `${ranking.careerPlayoffWins}-${ranking.careerPlayoffLosses}`
                  : '-'
                }
              </TableCell>
              <TableCell className={cn("text-center", getChampionshipColor(ranking.championships))}>
                {ranking.championships > 0 ? ranking.championships : '-'}
              </TableCell>
              <TableCell className={cn("text-center", getRunnerUpColor(ranking.runnerUps))}>
                {ranking.runnerUps > 0 ? ranking.runnerUps : '-'}
              </TableCell>
              <TableCell className="text-center">
                <span className={cn(
                  "font-bold px-2 py-1 rounded text-sm",
                  getPowerScoreColor(ranking.careerPowerScore)
                )}>
                  {ranking.careerPowerScore.toFixed(1)}
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