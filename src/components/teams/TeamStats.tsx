
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Team } from "@/types";

interface TeamStatsProps {
  team: Team;
  winPercentage?: string;
  pastMatches?: any[];
}

const calcPercentage = (wins: number, total: number): string => {
  if (total === 0) return "0.0%";
  return ((wins / total) * 100).toFixed(1) + "%";
};

const TeamStats: React.FC<TeamStatsProps> = ({ team, winPercentage, pastMatches = [] }) => {
  // Calculate game win percentage
  const gameWinPercentage = calcPercentage(
    team.game_wins || 0,
    (team.game_wins || 0) + (team.game_losses || 0)
  );

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Match Record</h3>
            <p className="text-2xl font-bold text-emerald-600">
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
            <h3 className="text-sm font-medium text-gray-500">Game Record</h3>
            <p className="text-2xl font-bold text-blue-600">
              {team.game_wins || 0}-{team.game_losses || 0}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Game Win %</h3>
            <p className="text-2xl font-bold">
              {gameWinPercentage}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
