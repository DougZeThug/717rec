
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { WeeklyHeatRanking } from "@/hooks/weekly/useWeeklyHeatRankings";
import { TeamLogo } from "@/components/shared/TeamLogo";

interface WeeklyHeatRankingsTableProps {
  rankings: WeeklyHeatRanking[];
  isLoading: boolean;
  weekOf?: string;
}

const WeeklyHeatRankingsTable: React.FC<WeeklyHeatRankingsTableProps> = ({
  rankings,
  isLoading,
  weekOf
}) => {
  const getStreakIcon = (streakType: string) => {
    switch (streakType) {
      case 'win':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'loss':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getHeatColor = (heatScore: number) => {
    if (heatScore >= 80) return "text-red-600 bg-red-50 dark:bg-red-950/20";
    if (heatScore >= 60) return "text-orange-600 bg-orange-50 dark:bg-orange-950/20";
    if (heatScore >= 40) return "text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20";
    if (heatScore >= 20) return "text-blue-600 bg-blue-50 dark:bg-blue-950/20";
    return "text-gray-600 bg-gray-50 dark:bg-gray-950/20";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Heat Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Weekly Heat Rankings
          {weekOf && (
            <Badge variant="outline" className="ml-2">
              Week of {new Date(weekOf).toLocaleDateString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rankings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No heat rankings available for this week
          </div>
        ) : (
          <div className="space-y-2">
            {rankings.map((ranking, index) => (
              <div
                key={ranking.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                  {index + 1}
                </div>

                {/* Team Info */}
                <div className="flex items-center gap-3 flex-1">
                  <TeamLogo 
                    imageUrl={ranking.team?.logo_url || ranking.team?.image_url} 
                    teamName={ranking.team?.name || 'Unknown'} 
                    size="sm" 
                  />
                  <div>
                    <div className="font-medium">{ranking.team?.name}</div>
                    {ranking.team?.divisionName && (
                      <div className="text-xs text-muted-foreground">
                        {ranking.team.divisionName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Record */}
                <div className="text-sm text-muted-foreground min-w-[60px] text-center">
                  {ranking.wins}-{ranking.losses}
                  {ranking.upsets > 0 && (
                    <div className="text-xs text-orange-600">
                      {ranking.upsets} upset{ranking.upsets !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Streak */}
                <div className="flex items-center gap-1 min-w-[60px] justify-center">
                  {getStreakIcon(ranking.streak_type)}
                  <span className="text-sm">
                    {ranking.current_streak || 0}
                  </span>
                </div>

                {/* Heat Score */}
                <div className={`px-3 py-1 rounded-full text-sm font-bold min-w-[80px] text-center ${getHeatColor(ranking.heat_score)}`}>
                  {ranking.heat_score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyHeatRankingsTable;
