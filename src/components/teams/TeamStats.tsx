
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Team, Match } from "@/types";
import TeamTrend from "./TeamTrend"; 

interface TeamStatsProps {
  team: Team;
  winPercentage: string;
  pastMatches?: Match[];
}

const TeamStats: React.FC<TeamStatsProps> = ({ team, winPercentage, pastMatches = [] }) => {
  const totalGames = team.wins + team.losses;
  
  const getRecordColor = () => {
    if (team.wins > team.losses) return "text-green-600";
    if (team.wins < team.losses) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Record</h3>
            <p className={`text-2xl font-bold ${getRecordColor()}`}>
              {team.wins}-{team.losses}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Win Percentage</h3>
            <p className="text-2xl font-bold">
              {winPercentage}%
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Total Matches</h3>
            <p className="text-2xl font-bold">
              {totalGames}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Trend</h3>
            <TeamTrend
              recentMatches={pastMatches || []}
              teamId={team.id}
              limit={5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
