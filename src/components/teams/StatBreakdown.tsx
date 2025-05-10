import React from "react";
import { Card } from "@/components/ui/card";
import { Laptop, Trophy, X, Target, Users, Zap, Scale, GitBranch, Medal } from "lucide-react";
import { formatPowerScore, getPowerScoreColor, getSosColor } from "@/utils/powerScore";
import RankTrendIndicator from "@/components/stats/RankTrendIndicator";
import { useTheme } from "next-themes";

interface StatBreakdownProps {
  wins: number;
  losses: number;
  winPercentage: string;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: string;
  strengthOfSchedule: string;
  closeMatchLosses: number;
  powerScore: number;
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
  rankChange
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const sos = parseFloat(strengthOfSchedule);
  
  React.useEffect(() => {
    if (rankChange !== undefined && rankChange !== 0) {
      console.log(`Team details - Rank: ${rank}, RankChange: ${rankChange}`);
    }
  }, [rank, rankChange]);
  
  return (
    <Card className="p-5 mb-6">
      <h2 className="text-xl font-semibold mb-4 font-oswald uppercase tracking-wider">Team Stats</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Zap size={16} className="mr-1" /> Power Score
            </div>
            <div className="text-2xl font-bold font-mono">
              <span className={getPowerScoreColor(powerScore)}>
                {formatPowerScore(powerScore)}
              </span>
            </div>
          </div>
          
          {rank && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
                <Medal size={16} className="mr-1" /> Ranking
              </div>
              <div className="flex items-center">
                <span className="text-2xl font-bold font-mono mr-3">
                  {rank}{totalTeams ? `/${totalTeams}` : ''}
                </span>
                {rankChange !== undefined && <RankTrendIndicator rankChange={rankChange} />}
              </div>
            </div>
          )}
          
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Scale size={16} className="mr-1" /> Strength of Schedule
            </div>
            <div className="text-2xl font-bold font-mono">
              <span className={!isLight ? getSosColor(sos) : ''}
                    style={{ 
                      color: isLight ? (
                        sos >= 0.875 ? '#b91c1c' :  // red-700
                        sos >= 0.750 ? '#ef4444' :  // red-500
                        sos >= 0.550 ? '#f97316' :  // orange-500
                        '#16a34a'  // green-600
                      ) : undefined 
                    }}>
                {strengthOfSchedule}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Laptop size={16} className="mr-1" /> Match Record
            </div>
            <div className="flex items-center">
              <div className="flex items-center text-green-500 mr-4">
                <Trophy size={16} className="mr-1" />
                <span className="text-2xl font-bold font-mono">{wins}</span>
              </div>
              <div className="flex items-center text-red-500">
                <X size={16} className="mr-1" />
                <span className="text-2xl font-bold font-mono">{losses}</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Target size={16} className="mr-1" /> Win Percentage
            </div>
            <div className="text-2xl font-bold font-mono">
              {winPercentage}%
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <GitBranch size={16} className="mr-1" /> Close Match Losses
            </div>
            <div className="text-2xl font-bold font-mono">
              {closeMatchLosses}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Users size={16} className="mr-1" /> Game Record
            </div>
            <div className="flex items-center">
              <div className="flex items-center text-green-500 mr-4">
                <Trophy size={16} className="mr-1" />
                <span className="text-2xl font-bold font-mono">{gamesWon}</span>
              </div>
              <div className="flex items-center text-red-500">
                <X size={16} className="mr-1" />
                <span className="text-2xl font-bold font-mono">{gamesLost}</span>
              </div>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mb-1">
              <Target size={16} className="mr-1" /> Game Win Percentage
            </div>
            <div className="text-2xl font-bold font-mono">
              {gameWinPercentage}%
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StatBreakdown;
