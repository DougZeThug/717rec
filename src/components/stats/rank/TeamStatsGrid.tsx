
import React from "react";

interface TeamStatsGridProps {
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  streak?: string;
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
  compactView = false
}) => {
  if (compactView) {
    return (
      <div className="mt-1 text-xs text-gray-500">
        <span className="inline-block mr-2">{wins}-{losses}</span>
        <span className="inline-block mr-2">
          Win: {(winPercentage * 100).toFixed(1)}%
        </span>
        <span className="inline-block">
          SOS: {sos.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
      <div className="p-1 bg-gray-50 rounded">
        <div className="text-xs text-gray-500">Record</div>
        <div className="font-semibold">{wins}-{losses}</div>
      </div>
      <div className="p-1 bg-gray-50 rounded">
        <div className="text-xs text-gray-500">Win %</div>
        <div className="font-semibold">{(winPercentage * 100).toFixed(1)}%</div>
      </div>
      <div className="p-1 bg-gray-50 rounded">
        <div className="text-xs text-gray-500">SOS</div>
        <div className="font-semibold">{sos.toFixed(2)}</div>
      </div>
      <div className="p-1 bg-gray-50 rounded">
        <div className="text-xs text-gray-500">Games</div>
        <div className="font-semibold">{gamesWon}-{gamesLost}</div>
      </div>
    </div>
  );
};
