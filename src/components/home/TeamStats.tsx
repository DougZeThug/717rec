
import React from "react";
import { Team } from "@/types";
import { calculateWinPercentage } from "@/utils/rankingUtils/calculateWinPercentage";

interface TeamStatsProps {
  team: Team;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ team }) => {
  // Parse and ensure we're working with numbers for calculations
  const wins = parseInt(String(team.wins)) || 0;
  const losses = parseInt(String(team.losses)) || 0;
  const gameWins = parseInt(String(team.game_wins)) || 0;
  const gameLosses = parseInt(String(team.game_losses)) || 0;
  const winPercentage = calculateWinPercentage(wins, losses) * 100;
  const sos = team.sos !== undefined ? team.sos : 0;
  const powerScore = team.power_score !== undefined ? team.power_score : 0;

  return (
    <div className="p-3 font-inter">
      <h3 className="text-lg font-bold mb-1.5 truncate text-[#1a1a1a] dark:text-white" title={team.name}>
        {team.name}
      </h3>
      <div className="flex justify-between text-xs">
        <span>Record:</span>
        <span className="font-medium">{wins} - {losses}</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>Win %:</span>
        <span className="font-medium">{winPercentage.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>Games:</span>
        <span className="font-medium">{gameWins}–{gameLosses}</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>SOS:</span>
        <span className="font-medium">{sos.toFixed(3)}</span>
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>Power Score:</span>
        <span className="font-medium">{powerScore.toFixed(1)}</span>
      </div>
      {team.divisionName && (
        <div className="flex justify-between text-xs mt-1">
          <span>Division:</span>
          <span className="font-medium">{team.divisionName}</span>
        </div>
      )}
    </div>
  );
};
