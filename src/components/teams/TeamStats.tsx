
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getPowerScoreColor, getSosColor, formatPowerScore } from "@/utils/colors";
import { StatBlock } from "@/components/teams/shared/StatBlock";
import { Trophy, Target, Users, Scale, Zap } from "lucide-react";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Match Record */}
          <StatBlock 
            label="Match Record" 
            value={`${wins}-${losses}`}
            className="bg-[#f9f9f9] dark:bg-black/30"
            icon={<Trophy size={18} className="text-emerald-500" />}
          />
          
          {/* Win Percentage */}
          <StatBlock 
            label="Win Percentage" 
            value={`${winPercentage}%`}
            className="bg-[#f9f9f9] dark:bg-black/30"
            icon={<Target size={18} className="text-purple-500" />}
          />
          
          {/* Game Record */}
          <StatBlock 
            label="Game Record" 
            value={`${gameWins}-${gameLosses}`}
            className="bg-[#f9f9f9] dark:bg-black/30"
            icon={<Users size={18} className="text-indigo-500" />}
          />
          
          {/* Game Win Percentage */}
          <StatBlock 
            label="Game Win %" 
            value={`${gameWinPercentage}%`}
            className="bg-[#f9f9f9] dark:bg-black/30"
            icon={<Target size={18} className="text-teal-500" />}
          />
          
          {/* SOS if available */}
          {sos !== undefined && (
            <StatBlock 
              label="Strength of Schedule" 
              value={<span className={sosColor}>{sos.toFixed(3)}</span>}
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Scale size={18} className="text-blue-500" />}
            />
          )}
          
          {/* Power Score if available */}
          {powerScore !== undefined && (
            <StatBlock 
              label="Power Score" 
              value={<span className={powerScoreColor}>{formatPowerScore(powerScore)}</span>}
              className="bg-[#f9f9f9] dark:bg-black/30"
              icon={<Zap size={18} className="text-amber-500" />}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamStats;
