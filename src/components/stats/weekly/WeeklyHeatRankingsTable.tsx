
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWeeklyHeatRankings } from "@/hooks/weekly";
import { TeamLogo } from "@/components/shared/TeamLogo";

const WeeklyHeatRankingsTable: React.FC = () => {
  const { data: rankings, isLoading, error } = useWeeklyHeatRankings();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Heat Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Heat Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Unable to load heat rankings. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!rankings || rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Heat Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            No heat rankings available for this week.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getHeatTrend = (score: number) => {
    if (score > 5) return { icon: TrendingUp, color: "text-red-500", bg: "bg-red-50" };
    if (score > 0) return { icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50" };
    if (score < -2) return { icon: TrendingDown, color: "text-blue-500", bg: "bg-blue-50" };
    return { icon: Minus, color: "text-gray-500", bg: "bg-gray-50" };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Weekly Heat Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rankings.map((ranking, index) => {
            const trend = getHeatTrend(ranking.heat_score);
            const TrendIcon = trend.icon;
            
            return (
              <div
                key={ranking.team_id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-sm font-bold">
                    {index + 1}
                  </div>
                  
                  <TeamLogo 
                    imageUrl={ranking.team?.logo_url || ranking.team?.image_url} 
                    teamName={ranking.team?.name || 'Unknown'} 
                    size="sm" 
                  />
                  
                  <div>
                    <div className="font-medium">{ranking.team?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {ranking.wins}W-{ranking.losses}L
                      {ranking.upsets > 0 && (
                        <span className="ml-2 text-amber-600">
                          • {ranking.upsets} upset{ranking.upsets !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {ranking.current_streak > 2 && (
                    <Badge variant="outline" className="text-xs">
                      {ranking.current_streak}{ranking.streak_type?.charAt(0).toUpperCase()}
                    </Badge>
                  )}
                  
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${trend.bg}`}>
                    <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                    <span className={`font-bold text-sm ${trend.color}`}>
                      {ranking.heat_score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyHeatRankingsTable;
