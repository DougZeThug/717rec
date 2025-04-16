
import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Ranking } from "@/types";

interface StatsSummaryCardsProps {
  rankings: Ranking[];
}

const StatsSummaryCards = ({ rankings }: StatsSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Total Teams</CardTitle>
          <CardDescription>Active teams in the league</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-cornhole-navy">{rankings.length}</div>
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
              {rankings.length > 0 ? (rankings[0]?.winPercentage * 100).toFixed(1) : 0}%
            </span>
            <span className="text-sm text-gray-500">
              {rankings.length > 0 ? rankings[0]?.teamName : 'No teams'}
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
              {rankings.length > 0 ? 
                rankings.reduce((max, team) => Math.max(max, team.wins), 0) : 
                0}
            </span>
            <span className="text-sm text-gray-500">
              {rankings.length > 0 ? 
                rankings.reduce((maxTeam, team) => team.wins > maxTeam.wins ? team : maxTeam, rankings[0]).teamName : 
                'No teams'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsSummaryCards;
