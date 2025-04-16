
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
}

const StatsSummaryCards = ({ rankings }: StatsSummaryCardsProps) => {
  const getHighestWinPercentage = () => {
    if (!rankings || rankings.length === 0) return { percentage: 0, teamName: 'No teams' };
    
    const highest = rankings.reduce((max, team) => 
      (team.winPercentage > max.winPercentage) ? team : max, rankings[0]);
    
    return {
      percentage: highest ? (highest.winPercentage * 100).toFixed(1) : 0,
      teamName: highest?.teamName || 'No teams'
    };
  };

  const getMostWins = () => {
    if (!rankings || rankings.length === 0) return { wins: 0, teamName: 'No teams' };
    
    const mostWinsTeam = rankings.reduce((maxTeam, team) => 
      ((team.wins || 0) > (maxTeam.wins || 0)) ? team : maxTeam, rankings[0]);
    
    return {
      wins: mostWinsTeam ? mostWinsTeam.wins : 0,
      teamName: mostWinsTeam?.teamName || 'No teams'
    };
  };

  const highestWinPercentage = getHighestWinPercentage();
  const mostWins = getMostWins();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Total Teams</CardTitle>
          <CardDescription>Active teams in the league</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-cornhole-navy">{rankings ? rankings.length : 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Highest Win %</CardTitle>
          <CardDescription>Best performing team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <span className="text-4xl font-bold text-cornhole-green">
              {highestWinPercentage.percentage}%
            </span>
            <span className="text-sm text-gray-500">
              {highestWinPercentage.teamName}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Most Wins</CardTitle>
          <CardDescription>Team with the most victories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <span className="text-4xl font-bold text-cornhole-navy">
              {mostWins.wins}
            </span>
            <span className="text-sm text-gray-500">
              {mostWins.teamName}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;
