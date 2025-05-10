
import React from "react";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import RankTrendIndicator from "../RankTrendIndicator";

interface TeamStatsGridProps {
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  streak: string;
  powerScore: number;
  rankChange?: number;
  compactView?: boolean;
}

export const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({
  wins,
  losses,
  gamesWon,
  gamesLost,
  sos,
  streak,
  powerScore,
  rankChange,
  compactView = false
}) => {
  const isMobile = useIsMobile();
  const powerScoreColorClass = getPowerScoreColor(powerScore);

  if (compactView || !isMobile) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>{wins}-{losses}</span>
        <span className={powerScoreColorClass}>{formatPowerScore(powerScore)}</span>
      </div>
    );
  }

  // New detailed mobile view layout with consistent styling matching StatBreakdown
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {/* Record Stats */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Record</span>
          <span className="font-medium">{wins}-{losses}</span>
        </div>
      </div>

      {/* Game Stats */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Games</span>
          <span className="font-medium">{gamesWon}-{gamesLost}</span>
        </div>
      </div>

      {/* SOS */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">SOS</span>
          <span className="font-medium">{sos.toFixed(3)}</span>
        </div>
      </div>

      {/* Streak */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Streak</span>
          <span className="font-medium">{streak || '-'}</span>
        </div>
      </div>

      {/* Power Score */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Power Score</span>
          <span className={cn("font-medium", powerScoreColorClass)}>
            {formatPowerScore(powerScore)}
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className="space-y-1 bg-slate-50 dark:bg-slate-800/30 p-2 rounded-lg">
        <div className="flex flex-col">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Trend</span>
          <RankTrendIndicator rankChange={rankChange} />
        </div>
      </div>
    </div>
  );
};
