
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, TrendingUp } from "lucide-react";
import { Ranking } from "@/types";

interface StatsSummarySectionProps {
  rankings: Ranking[];
}

const StatsSummarySection: React.FC<StatsSummarySectionProps> = ({ rankings }) => {
  const totalTeams = rankings.length;
  const totalMatches = rankings.reduce((sum, team) => sum + team.wins + team.losses, 0) / 2; // Divide by 2 since each match involves 2 teams
  const totalGames = rankings.reduce((sum, team) => sum + team.gamesWon + team.gamesLost, 0) / 2;
  const averageGamesPerMatch = totalMatches > 0 ? (totalGames / totalMatches).toFixed(1) : "0";

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
          <div className="text-2xl font-bold">{totalMatches}</div>
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
