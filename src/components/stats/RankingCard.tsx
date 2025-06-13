
import React from "react";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { TeamLogo } from "@/components/shared/TeamLogo";
import RankTrendIndicator from "./RankTrendIndicator";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { getPowerScoreColor, getSosColor } from "@/utils/colors";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({ 
  ranking, 
  index, 
  showRankChange = true 
}) => {
  const rank = index + 1;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            #{rank}
          </span>
          {showRankChange && (
            <RankTrendIndicator rankChange={ranking.rankChange} />
          )}
        </div>
        <TeamBadgeCollection 
          teamId={ranking.teamId}
          size="sm"
          maxDisplay={3}
        />
      </div>
      
      <Link 
        to={`/teams/${ranking.teamId}`}
        className="flex items-center gap-3 mb-4 group"
      >
        <TeamLogo
          imageUrl={ranking.logoUrl || ranking.imageUrl}
          teamName={ranking.teamName}
          size="md"
          className="flex-shrink-0"
        />
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
            {ranking.teamName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {ranking.divisionName}
          </p>
        </div>
      </Link>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Record</p>
          <p className="text-slate-900 dark:text-white font-bold">
            {ranking.wins}-{ranking.losses}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Win %</p>
          <p className={cn(
            "font-bold",
            winPercentage >= 75 ? "text-green-600 dark:text-green-500" :
            winPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
            winPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
            "text-red-600 dark:text-red-500"
          )}>
            {winPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Games</p>
          <p className="text-slate-900 dark:text-white font-bold">
            {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Game %</p>
          <p className={cn(
            "font-bold",
            gameWinPercentage >= 75 ? "text-green-600 dark:text-green-500" :
            gameWinPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
            gameWinPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
            "text-red-600 dark:text-red-500"
          )}>
            {gameWinPercentage.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Power</p>
          <p className={cn("font-bold", getPowerScoreColor(ranking.powerScore))}>
            {ranking.powerScore.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">SOS</p>
          <p className={cn("font-bold", getSosColor(ranking.sos || 0))}>
            {(ranking.sos || 0).toFixed(3)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RankingCard;
