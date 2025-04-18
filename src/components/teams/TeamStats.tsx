
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Team, Match } from "@/types";
import TeamTrend from "./TeamTrend"; 
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";

interface TeamStatsProps {
  team: Team;
  winPercentage: string;
  pastMatches?: Match[];
}

const TeamStats: React.FC<TeamStatsProps> = ({ team, winPercentage, pastMatches = [] }) => {
  // Parse and ensure we're working with numbers
  const wins = parseInt(String(team.wins)) || 0;
  const losses = parseInt(String(team.losses)) || 0;
  const totalMatches = wins + losses;

  // Parse game stats if available
  const gameWins = parseInt(String(team.game_wins)) || 0;
  const gameLosses = parseInt(String(team.game_losses)) || 0;
  const totalGames = gameWins + gameLosses;
  
  const getRecordColor = () => {
    if (wins > losses) return "text-green-600";
    if (wins < losses) return "text-red-600";
    return "text-gray-600";
  };
  
  const getGameRecordColor = () => {
    if (gameWins > gameLosses) return "text-green-600";
    if (gameWins < gameLosses) return "text-red-600";
    return "text-gray-600";
  };
  
  // For debugging purposes
  console.log(`TeamStats component - Team: ${team.name}`);
  console.log(`Match Record: ${wins}-${losses}, Win%: ${winPercentage}`);
  console.log(`Game Record: ${gameWins}-${gameLosses}, Total Games: ${totalGames}`);

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Match Record</h3>
            <p className={`text-2xl font-bold ${getRecordColor()}`}>
              {wins}-{losses}
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
            <p className={`text-2xl font-bold ${getGameRecordColor()}`}>
              {gameWins}-{gameLosses}
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
