
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

  // More compact mobile view
  return (
    <div className="flex items-center justify-between text-xs gap-1">
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded-lg flex-1">
        <span className="text-gray-500 dark:text-gray-400 text-[10px]">Record</span>
        <span className="font-medium">{wins}-{losses}</span>
      </div>
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded-lg flex-1">
        <span className="text-gray-500 dark:text-gray-400 text-[10px]">SOS</span>
        <span className="font-medium">{sos.toFixed(3)}</span>
      </div>
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded-lg flex-1">
        <span className="text-gray-500 dark:text-gray-400 text-[10px]">Power</span>
        <span className={cn("font-medium", powerScoreColorClass)}>
          {formatPowerScore(powerScore)}
        </span>
      </div>
      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/30 p-1.5 rounded-lg flex-1">
        <span className="text-gray-500 dark:text-gray-400 text-[10px]">Trend</span>
        <RankTrendIndicator rankChange={rankChange} mobileView={true} />
      </div>
    </div>
  );
};
