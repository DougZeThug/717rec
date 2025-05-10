
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getPowerScoreColor, getSosColor } from "@/utils/colors";

interface TeamStatsProps {
  wins: number;
  losses: number;
  gameWins: number;
  gameLosses: number;
  winPercentage: string;
  gameWinPercentage: string;
  sos?: number;
  closeMatchLosses?: number;
  powerScore?: number;
}

const labelClass =
  "font-inter uppercase text-xs sm:text-sm tracking-widest text-gray-500 dark:text-gray-400";
const valueClass =
  "font-mono text-base text-gray-800 dark:text-white text-center";

const TeamStats: React.FC<TeamStatsProps> = ({
  wins,
  losses,
  gameWins,
  gameLosses,
  winPercentage,
  gameWinPercentage,
  sos,
  closeMatchLosses,
  powerScore,
}) => {
  const powerScoreColor = powerScore !== undefined ? getPowerScoreColor(powerScore) : "";
  const sosColor = sos !== undefined ? getSosColor(sos) : "";

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <h3 className={labelClass}>Match Record</h3>
            <p className={`${valueClass}`}>
              {wins}-{losses}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className={labelClass}>Win Percentage</h3>
            <p className={valueClass}>
              {winPercentage}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className={labelClass}>Game Record</h3>
            <p className={valueClass}>
              {gameWins}-{gameLosses}
            </p>
          </div>
          <div className="space-y-1">
            <h3 className={labelClass}>Game Win %</h3>
            <p className={valueClass}>
              {gameWinPercentage}
            </p>
          </div>
          {sos !== undefined && (
            <div className="space-y-1">
              <h3 className={labelClass}>Strength of Schedule</h3>
              <p className={`${valueClass} ${sosColor}`}>
                {sos.toFixed(3)}
              </p>
            </div>
          )}
          {powerScore !== undefined && (
            <div className="space-y-1">
              <h3 className={labelClass}>Power Score</h3>
              <p className={`${valueClass} ${powerScoreColor}`}>
                {powerScore.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
