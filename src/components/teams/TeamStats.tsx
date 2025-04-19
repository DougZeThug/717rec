
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface TeamStatsProps {
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  winPercentage: string;
  gameWinPercentage: string;
  sos?: number;
  closeMatchLosses?: number;
  powerScore?: number;
}

const TeamStats: React.FC<TeamStatsProps> = ({ 
  wins, 
  losses, 
  gameWins, 
  gameLosses, 
  winPercentage, 
  gameWinPercentage,
  sos,
  closeMatchLosses,
  powerScore 
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Match Record</h3>
            <p className="text-2xl font-bold text-emerald-600">
              {wins}-{losses}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Win Percentage</h3>
            <p className="text-2xl font-bold">
              {winPercentage}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Game Record</h3>
            <p className="text-2xl font-bold text-blue-600">
              {gameWins}-{gameLosses}
            </p>
          </div>
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Game Win %</h3>
            <p className="text-2xl font-bold">
              {gameWinPercentage}
            </p>
          </div>
          
          {sos !== undefined && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Strength of Schedule</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {sos.toFixed(3)}
              </p>
            </div>
          )}
          
          {powerScore !== undefined && (
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-500">Power Score</h3>
              <p className="text-2xl font-bold text-purple-600">
                {powerScore.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
