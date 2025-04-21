
import React from "react";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface TeamStatsGridProps {
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  streak?: string;
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
  streak = "—",
  powerScore,
  compactView = false
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const powerScoreColor = getPowerScoreColor(powerScore);

  if (compactView) {
    return (
      <div className="mt-1 flex items-center gap-3 text-xs">
        <span style={isLight ? { color: "#222222" } : {}}>
          {wins}-{losses}
        </span>
        <span 
          className={isLight ? "" : powerScoreColor}
          style={isLight ? {
            color: powerScore >= 80 ? '#45c47e' : 
                   powerScore >= 70 ? '#3887e6' : 
                   powerScore < 40 ? '#e13d3d' : 
                   '#222222'
          } : {}}
        >
          {formatPowerScore(powerScore)}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      "mt-2 grid gap-2",
      "grid-cols-2 sm:grid-cols-4"
    )}>
      <div className={cn(
        "p-2 rounded",
        isLight ? "bg-gray-50" : "bg-gray-800/30"
      )}>
        <div className="text-xs text-gray-500">Record</div>
        <div className="font-semibold" style={isLight ? { color: "#222222" } : {}}>
          {wins}-{losses}
        </div>
      </div>

      <div className={cn(
        "p-2 rounded",
        isLight ? "bg-gray-50" : "bg-gray-800/30"
      )}>
        <div className="text-xs text-gray-500">Games</div>
        <div className="font-semibold" style={isLight ? { color: "#222222" } : {}}>
          {gamesWon}-{gamesLost}
        </div>
      </div>

      <div className={cn(
        "p-2 rounded",
        isLight ? "bg-gray-50" : "bg-gray-800/30"
      )}>
        <div className="text-xs text-gray-500">SOS</div>
        <div className="font-semibold" style={isLight ? { color: "#222222" } : {}}>
          {sos.toFixed(3)}
        </div>
      </div>

      <div className={cn(
        "p-2 rounded",
        isLight ? "bg-gray-50" : "bg-gray-800/30"
      )}>
        <div className="text-xs text-gray-500">Streak</div>
        <div className="font-semibold" style={isLight ? { color: "#222222" } : {}}>
          {streak}
        </div>
      </div>
    </div>
  );
};
