
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { Match } from "@/types";

interface StatsSummarySectionProps {
  matches: Match[];
}

const StatsSummarySection: React.FC<StatsSummarySectionProps> = ({ matches }) => {
  const completedMatches = matches.filter(match => match.iscompleted).length;
  const totalTeams = new Set([
    ...matches.map(m => m.team1Id),
    ...matches.map(m => m.team2Id)
  ]).size;
  
  const totalGames = matches.reduce((sum, match) => {
    return sum + (match.team1_game_wins || 0) + (match.team2_game_wins || 0);
  }, 0);
  
  const averageGamesPerMatch = completedMatches > 0 ? (totalGames / completedMatches).toFixed(1) : "0";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTeams}</div>
          <p className="text-xs text-muted-foreground">Active teams this season</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Matches Played</CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{completedMatches}</div>
          <p className="text-xs text-muted-foreground">Completed this season</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageGamesPerMatch}</div>
          <p className="text-xs text-muted-foreground">Games per match</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummarySection;
