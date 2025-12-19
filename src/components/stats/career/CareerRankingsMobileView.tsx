import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CareerRanking } from '@/types/career';
import { CareerSortOptions } from './CareerRankingsTable';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, List, LayoutGrid } from 'lucide-react';
import { getPowerScoreColor, getSosColor } from '@/utils/colors';
import { getWinPercentageColor } from '@/utils/colors/winPercentageColors';
import { getChampionshipColor, getRunnerUpColor } from '@/utils/colors/championshipColors';
import { cn } from '@/lib/utils';

interface CareerRankingsMobileViewProps {
  rankings: CareerRanking[];
  sortOptions: CareerSortOptions;
  onSortChange: (field: string) => void;
  showHidden?: boolean;
}

const CareerRankingsMobileView: React.FC<CareerRankingsMobileViewProps> = ({
  rankings,
  sortOptions,
  onSortChange,
  showHidden = false
}) => {
  const [isCompactView, setIsCompactView] = useState(false);
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
      {/* View Toggle and Sort Controls */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={isCompactView ? "outline" : "default"}
              size="sm"
              onClick={() => setIsCompactView(false)}
              className="text-xs"
            >
              <LayoutGrid className="h-3 w-3 mr-1" />
              Detailed
            </Button>
            <Button
              variant={isCompactView ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCompactView(true)}
              className="text-xs"
            >
              <List className="h-3 w-3 mr-1" />
              Compact
            </Button>
          </div>
        </div>
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
      </div>

      {/* Rankings Cards */}
      {rankings.map((ranking, index) => (
        <Card key={ranking.teamId} className={cn(
          "overflow-hidden",
          ranking.divisionName === 'Hidden' ? 'border-muted bg-muted/30' : ''
        )}>
          <CardContent className={cn("p-4", isCompactView && "p-3")}>
            {isCompactView ? (
              // Compact View
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-bold text-muted-foreground min-w-6">
                    #{index + 1}
                  </span>
                  <Link
                    to={`/teams/${ranking.teamId}`}
                    className="flex items-center gap-3 flex-1 min-w-0 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {ranking.imageUrl && (
                      <img 
                        src={ranking.imageUrl} 
                        alt={`${ranking.teamName} logo`}
                        className="w-6 h-6 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ranking.teamName}
                        </h3>
                        {showHidden && ranking.divisionName === 'Hidden' && (
                          <span className="px-2 py-1 text-xs bg-muted-foreground/20 text-muted-foreground rounded-full border flex-shrink-0">
                            Hidden
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ranking.careerMatchWins}-{ranking.careerMatchLosses}</span>
                        <span className={getWinPercentageColor(ranking.careerWinPercentage)}>
                          ({formatPercentage(ranking.careerWinPercentage)})
                        </span>
                        {ranking.championships > 0 && (
                          <span className={getChampionshipColor(ranking.championships)}>🏆{ranking.championships}</span>
                        )}
                        <span className={getSosColor(ranking.careerSos)}>
                          SOS: {ranking.careerSos.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
                <span className={cn(
                  "font-bold px-2 py-1 rounded text-xs",
                  getPowerScoreColor(ranking.careerPowerScore)
                )}>
                  {ranking.careerPowerScore.toFixed(1)}
                </span>
              </div>
            ) : (
              // Detailed View
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      #{index + 1}
                    </span>
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
                        <h3 className="font-semibold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {ranking.teamName}
                        </h3>
                        {showHidden && ranking.divisionName === 'Hidden' && (
                          <span className="px-2 py-1 text-xs bg-muted-foreground/20 text-muted-foreground rounded-full border">
                            Hidden
                          </span>
                        )}
                      </div>
                    </Link>
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
                      <span className={getWinPercentageColor(ranking.careerWinPercentage)}>
                        ({formatPercentage(ranking.careerWinPercentage)})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Game Record</p>
                    <p className="font-medium">
                      {ranking.careerGameWins}-{ranking.careerGameLosses}
                      <span className={getWinPercentageColor(ranking.careerGameWinPercentage)}>
                        ({formatPercentage(ranking.careerGameWinPercentage)})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Championships</p>
                    <p className={cn("font-medium", getChampionshipColor(ranking.championships))}>
                      {ranking.championships > 0 ? ranking.championships : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Runner-ups</p>
                    <p className={cn("font-medium", getRunnerUpColor(ranking.runnerUps))}>
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
                    <p className={cn("font-medium font-mono", getSosColor(ranking.careerSos))}>
                      {ranking.careerSos.toFixed(3)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CareerRankingsMobileView;