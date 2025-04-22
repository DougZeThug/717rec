import React from "react";

interface StatBreakdownProps {
  wins: number;
  losses: number;
  winPercentage: string;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: string;
  strengthOfSchedule: string;
  closeMatchLosses?: number;
  powerScore?: number;
  rank?: number;
  totalTeams?: number;
  rankChange?: number;
}

const StatBreakdown: React.FC<StatBreakdownProps> = ({
  wins,
  losses,
  winPercentage,
  gamesWon,
  gamesLost,
  gameWinPercentage,
  strengthOfSchedule,
  closeMatchLosses,
  powerScore,
  rank,
  totalTeams,
  rankChange,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {/* Record */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Record
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {wins}-{losses}
        </span>
      </div>
      {/* Win Percentage */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Win %
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {winPercentage}
        </span>
      </div>
      {/* Game Record */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Game Record
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {gamesWon}-{gamesLost}
        </span>
      </div>
      {/* Game Win % */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Game Win %
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {gameWinPercentage}
        </span>
      </div>
      {/* Strength of Schedule */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          SOS
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {strengthOfSchedule}
        </span>
      </div>
      {/* Close Match Losses */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Close Losses
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {closeMatchLosses ?? 0}
        </span>
      </div>
      {/* Power Score */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Power Score
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {powerScore !== undefined ? powerScore.toFixed(1) : "-"}
        </span>
      </div>
      {/* Rank */}
      <div className="flex flex-col">
        <span className="font-inter uppercase text-xs tracking-widest text-gray-600 dark:text-gray-400">
          Rank
        </span>
        <span className="font-mono text-base font-medium text-right sm:text-center text-[#2c2c2c] dark:text-white">
          {rank && totalTeams ? `${rank} / ${totalTeams}` : "-"}
        </span>
      </div>
    </div>
  );
};

export default StatBreakdown;
