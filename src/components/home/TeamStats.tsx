
import React from "react";
import { Team } from "@/types";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { Trophy, X } from "lucide-react";

interface TeamStatsProps {
  team: Team;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ team }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col">
        <span className="font-inter uppercase tracking-widest text-xs text-gray-500 dark:text-gray-400">Record</span>
        <div className="text-base font-mono font-medium text-gray-800 dark:text-white flex items-center">
          <Trophy size={14} className="text-emerald-500 mr-1" /> 
          <span>{team.wins || 0}</span>
          <span className="mx-1">-</span>
          <X size={14} className="text-rose-500 mr-1" />
          <span>{team.losses || 0}</span>
        </div>
      </div>
      <div className="flex flex-col">
        <span className="font-inter uppercase tracking-widest text-xs text-gray-500 dark:text-gray-400">Power Score</span>
        <span className={`text-base font-mono font-medium ${getPowerScoreColor(team.power_score)}`}>
          {formatPowerScore(team.power_score)}
        </span>
      </div>
    </div>
  );
};
