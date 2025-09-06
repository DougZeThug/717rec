import React from 'react';
import { CareerRanking } from '@/types/career';
import { CareerSortOptions } from './CareerRankingsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { getPowerScoreColor } from '@/utils/colors';
import { cn } from '@/lib/utils';

interface CareerRankingsMobileViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
}

const CareerRankingsMobileView: React.FC<CareerRankingsMobileViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
}) => {
  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getSortIcon = (field: string) => {
    if (sortOptions.field !== field) return null;
    return sortOptions.direction === 'desc' ? 
      <ArrowDown className="h-4 w-4" /> : 
      <ArrowUp className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
        <Button
          variant={sortOptions.field === 'careerPowerScore' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange('careerPowerScore')}
          className="text-xs"
        >
          Power Score {getSortIcon('careerPowerScore')}
        </Button>
        <Button
          variant={sortOptions.field === 'careerWinPercentage' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange('careerWinPercentage')}
          className="text-xs"
        >
          Win % {getSortIcon('careerWinPercentage')}
        </Button>
        <Button
          variant={sortOptions.field === 'championships' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange('championships')}
          className="text-xs"
        >
          Championships {getSortIcon('championships')}
        </Button>
      </div>

      {/* Rankings Cards */}
      {rankings.map((ranking, index) => (
        <Card key={ranking.teamId} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-muted-foreground">
                  #{index + 1}
                </span>
                {ranking.imageUrl && (
                  <img 
                    src={ranking.imageUrl} 
                    alt={`${ranking.teamName} logo`}
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <h3 className="font-semibold">{ranking.teamName}</h3>
              </div>
              <span className={cn(
                "font-bold px-3 py-1 rounded text-sm",
                getPowerScoreColor(ranking.careerPowerScore)
              )}>
                {ranking.careerPowerScore.toFixed(1)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Career Record</p>
                <p className="font-medium">
                  {ranking.careerMatchWins}-{ranking.careerMatchLosses} 
                  ({formatPercentage(ranking.careerWinPercentage)})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Game Record</p>
                <p className="font-medium">
                  {ranking.careerGameWins}-{ranking.careerGameLosses}
                  ({formatPercentage(ranking.careerGameWinPercentage)})
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Championships</p>
                <p className="font-medium">
                  {ranking.championships > 0 ? ranking.championships : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Runner-ups</p>
                <p className="font-medium">
                  {ranking.runnerUps > 0 ? ranking.runnerUps : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Playoff Record</p>
                <p className="font-medium">
                  {ranking.careerPlayoffWins > 0 || ranking.careerPlayoffLosses > 0 
                    ? `${ranking.careerPlayoffWins}-${ranking.careerPlayoffLosses}`
                    : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Career SOS</p>
                <p className="font-medium">{ranking.careerSOS.toFixed(3)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CareerRankingsMobileView;