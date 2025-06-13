
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Trophy, Target, Calendar } from "lucide-react";
import { useLatestWeeklyDigest } from "@/hooks/weekly";
import { TeamLogo } from "@/components/shared/TeamLogo";

const WeeklyOverview: React.FC = () => {
  const { data: digest, isLoading, error } = useLatestWeeklyDigest();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !digest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Unable to load weekly overview. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const digestData = digest.digest_data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          Weekly Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20">
            <div className="text-2xl font-bold text-blue-600">{digest.total_matches}</div>
            <div className="text-sm text-muted-foreground">Total Matches</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20">
            <div className="text-2xl font-bold text-amber-600">{digest.total_upsets}</div>
            <div className="text-sm text-muted-foreground">Upsets</div>
          </div>
        </div>

        {/* Hottest & Coolest Teams */}
        <div className="space-y-4">
          {digestData.hottest_team && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <TrendingUp className="w-5 h-5 text-red-500" />
              <TeamLogo 
                imageUrl={null} 
                teamName={digestData.hottest_team.name} 
                size="sm" 
              />
              <div className="flex-1">
                <div className="font-medium">Hottest Team</div>
                <div className="text-sm text-muted-foreground">
                  {digestData.hottest_team.name} • {digestData.hottest_team.heat_score?.toFixed(1)} heat
                </div>
              </div>
            </div>
          )}

          {digestData.coolest_team && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <Target className="w-5 h-5 text-blue-500" />
              <TeamLogo 
                imageUrl={null} 
                teamName={digestData.coolest_team.name} 
                size="sm" 
              />
              <div className="flex-1">
                <div className="font-medium">Coolest Team</div>
                <div className="text-sm text-muted-foreground">
                  {digestData.coolest_team.name} • {digestData.coolest_team.heat_score?.toFixed(1)} heat
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Highlights */}
        {digestData.highlights && digestData.highlights.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Week Highlights
            </h4>
            <div className="space-y-2">
              {digestData.highlights.slice(0, 3).map((highlight: any, index: number) => (
                <div key={index} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {highlight.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm">{highlight.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeeklyOverview;
