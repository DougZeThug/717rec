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
    <div className="mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-1">
          <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Match Record</h3>
          <p className="font-mono text-2xl font-bold text-emerald-600 text-right sm:text-center">
            {wins}-{losses}
          </p>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Win Percentage</h3>
          <p className="font-mono text-2xl font-bold text-right sm:text-center">
            {winPercentage}
          </p>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Game Record</h3>
          <p className="font-mono text-2xl font-bold text-blue-600 text-right sm:text-center">
            {gameWins}-{gameLosses}
          </p>
        </div>
        
        <div className="space-y-1">
          <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Game Win %</h3>
          <p className="font-mono text-2xl font-bold text-right sm:text-center">
            {gameWinPercentage}
          </p>
        </div>
        
        {sos !== undefined && (
          <div className="space-y-1">
            <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Strength of Schedule</h3>
            <p className="font-mono text-2xl font-bold text-indigo-600 text-right sm:text-center">
              {sos.toFixed(3)}
            </p>
          </div>
        )}
        
        {powerScore !== undefined && (
          <div className="space-y-1">
            <h3 className="font-inter uppercase text-xs tracking-widest text-gray-500">Power Score</h3>
            <p className="font-mono text-2xl font-bold text-purple-600 text-right sm:text-center">
              {powerScore.toFixed(1)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamStats;
