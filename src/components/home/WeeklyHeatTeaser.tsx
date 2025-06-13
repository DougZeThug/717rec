
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useWeeklyHeatRankings } from "@/hooks/weekly";
import { TeamLogo } from "@/components/shared/TeamLogo";

const WeeklyHeatTeaser: React.FC = () => {
  const { data: rankings, isLoading } = useWeeklyHeatRankings();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            Weekly Heat Index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topTeams = rankings?.slice(0, 3) || [];

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Weekly Heat Index
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {topTeams.map((team, index) => (
            <div key={team.team_id} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 text-xs font-bold">
                {index + 1}
              </div>
              <TeamLogo 
                imageUrl={team.team?.logo_url || team.team?.image_url} 
                teamName={team.team?.name || 'Unknown'} 
                size="sm" 
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{team.team?.name}</div>
                <div className="text-xs text-muted-foreground">
                  Heat: {team.heat_score?.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t">
          <Link to="/stats/weekly">
            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              View Full Heat Rankings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyHeatTeaser;
