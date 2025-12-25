import React from "react";
import { getSosColor } from "@/utils/colors";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import RankTrendIndicator from "../RankTrendIndicator";
import { PowerScoreDisplay } from "@/components/ui/PowerScoreDisplay";

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
  const sosColorClass = getSosColor(sos);

  if (compactView || !isMobile) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
        <span className="tabular-nums">{wins}-{losses}</span>
        <PowerScoreDisplay score={powerScore} source="v_team_details" display="text" className="tabular-nums" />
      </div>
    );
  }

  // New 2-row mobile view layout with stats on one row
  return (
    <div className="space-y-1 text-sm">
      {/* Stats row with evenly spaced items */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col items-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Record</span>
          <span className="font-medium tabular-nums text-gray-900 dark:text-white">{wins}-{losses}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Power</span>
          <PowerScoreDisplay score={powerScore} source="v_team_details" display="gauge" size="sm" showLabel={false} />
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs">SOS</span>
          <span className={cn("font-medium tabular-nums", sosColorClass)}>{sos.toFixed(3)}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span className="text-gray-500 dark:text-gray-400 text-xs">Trend</span>
          <RankTrendIndicator rankChange={rankChange} />
        </div>
      </div>
    </div>
  );
};
