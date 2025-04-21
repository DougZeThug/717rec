
import React from "react";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  compactView?: boolean;
}

export const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({
  wins,
  losses,
  winPercentage,
  gamesWon,
  gamesLost,
  gameWinPercentage,
  sos,
  streak,
  powerScore,
  compactView = false
}) => {
  const isMobile = useIsMobile();
  const powerScoreColorClass = getPowerScoreColor(powerScore);

  if (compactView || isMobile) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span>{wins}-{losses}</span>
        <span className={powerScoreColorClass}>{formatPowerScore(powerScore)}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Record</p>
        <p className="font-medium">{wins}-{losses}</p>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Games</p>
        <p className="font-medium">{gamesWon}-{gamesLost}</p>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">SOS</p>
        <p className="font-medium">{sos.toFixed(3)}</p>
      </div>
      
      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Power</p>
        <p className={cn("font-medium", powerScoreColorClass)}>
          {formatPowerScore(powerScore)}
        </p>
      </div>

      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Win %</p>
        <p className="font-medium">{(winPercentage * 100).toFixed(1)}%</p>
      </div>

      <div className="space-y-0.5">
        <p className="text-gray-500 dark:text-gray-400 text-xs">Game Win %</p>
        <p className="font-medium">{(gameWinPercentage * 100).toFixed(1)}%</p>
      </div>

      {streak && (
        <div className="space-y-0.5">
          <p className="text-gray-500 dark:text-gray-400 text-xs">Streak</p>
          <p className="font-medium">{streak}</p>
        </div>
      )}
    </div>
  );
};
