
import React from "react";
import { Team } from "@/types";
import { formatPowerScore, getPowerScoreColor, getSosColor } from "@/utils/colors";
import { Trophy, X } from "lucide-react";

interface TeamStatsProps {
  team: Team;
}

export const TeamStats: React.FC<TeamStatsProps> = ({ team }) => {
  const hasGames = (team.wins || 0) + (team.losses || 0) > 0;
  
  return (
    <>
      {/* Mobile: Compact single row */}
      <div className="flex sm:hidden items-center gap-2 text-sm font-mono">
        <span className="flex items-center text-foreground">
          <Trophy size={12} className="text-emerald-500 mr-0.5" />
          {team.wins || 0}-{team.losses || 0}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={getPowerScoreColor(team.power_score)}>
          {formatPowerScore(team.power_score)}
        </span>
        {team.sos !== undefined && (
          <>
            <span className="text-muted-foreground">·</span>
            <span className={hasGames ? getSosColor(team.sos) : 'text-muted-foreground'}>
              {hasGames ? team.sos.toFixed(3) : 'N/A'}
            </span>
          </>
        )}
      </div>

      {/* Desktop: Grid layout with labels */}
      <div className="hidden sm:grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-gray-500 dark:text-gray-400">Record</span>
          <div className="font-mono text-base font-medium text-gray-800 dark:text-white flex items-center">
            <Trophy size={14} className="text-emerald-500 mr-1" /> {team.wins || 0}
            <span className="mx-1">-</span>
            <X size={14} className="text-rose-500 mr-1" /> {team.losses || 0}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-inter uppercase text-xs tracking-widest text-gray-500 dark:text-gray-400">Power Score</span>
          <span className={`font-mono text-base font-medium ${getPowerScoreColor(team.power_score)}`}>
            {formatPowerScore(team.power_score)}
          </span>
        </div>

        {team.sos !== undefined && (
          <div className="flex flex-col">
            <span className="font-inter uppercase text-xs tracking-widest text-gray-500 dark:text-gray-400">SOS</span>
            <span className={`font-mono text-base font-medium ${hasGames ? getSosColor(team.sos) : 'text-muted-foreground'}`}>
              {hasGames ? team.sos.toFixed(3) : 'N/A'}
            </span>
          </div>
        )}
      </div>
    </>
  );
};
