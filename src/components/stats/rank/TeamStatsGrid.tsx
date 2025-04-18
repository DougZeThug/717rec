
import React from "react";

interface TeamStatsGridProps {
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon?: number;
  gamesLost?: number;
  gameWinPercentage?: number;
  sos?: number;
  streak?: string;
  compactView?: boolean;
}

export const TeamStatsGrid: React.FC<TeamStatsGridProps> = ({
  wins,
  losses,
  winPercentage,
  gamesWon = 0,
  gamesLost = 0,
  gameWinPercentage,
  sos = 0,
  streak = "—",
  compactView = false
}) => {
  if (compactView) {
    return (
      <div className="flex justify-between mt-2 text-sm">
        <div className="text-gray-700">
          <span>{wins}-{losses}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">Record</div>
        <div>{wins}-{losses}</div>
      </div>
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">Win %</div>
        <div>{(winPercentage * 100).toFixed(1)}%</div>
      </div>
      
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">Games</div>
        <div>{gamesWon}-{gamesLost}</div>
      </div>
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">Game Win %</div>
        <div>
          {gameWinPercentage !== undefined
            ? (gameWinPercentage * 100).toFixed(1) + "%"
            : "—"}
        </div>
      </div>
      
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">SOS</div>
        <div>{sos.toFixed(3)}</div>
      </div>
      <div className="p-1.5 bg-gray-50 rounded text-center">
        <div className="text-gray-500 text-xs">Streak</div>
        <div>{streak}</div>
      </div>
    </div>
  );
};
