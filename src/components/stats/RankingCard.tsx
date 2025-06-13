import React from "react";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { TeamLogo } from "@/components/shared/TeamLogo";
import RankTrendIndicator from "./RankTrendIndicator";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { getPowerScoreColor, getSosColor, formatPowerScore } from "@/utils/colors";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  expandedTeam?: string | null;
  onToggleExpand?: (teamId: string) => void;
  compactView?: boolean;
  showDivision?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({ 
  ranking, 
  index, 
  showRankChange = true,
  expandedTeam,
  onToggleExpand,
  compactView = false,
  showDivision = false
}) => {
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;
  const isExpanded = expandedTeam === ranking.teamId;

  const handleToggleExpand = () => {
    if (onToggleExpand) {
      onToggleExpand(ranking.teamId);
    }
  };

  // Format rank display based on view mode
  const formatRankDisplay = () => {
    if (showDivision) {
      // Unified view: show only global rank
      return `#${globalRank}`;
    } else {
      // Division view: show division rank with global rank in parentheses
      if (divisionRank) {
        return `#${divisionRank} (${globalRank})`;
      }
      return `#${globalRank}`;
    }
  };

  if (compactView) {
    return (
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3 hover:shadow-md transition-shadow cursor-pointer"
        onClick={handleToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
              {formatRankDisplay()}
            </span>
            {showRankChange && (
              <RankTrendIndicator rankChange={ranking.rankChange} />
            )}
          </div>
          <TeamBadgeCollection 
            teamId={ranking.teamId}
            size="sm"
            maxDisplay={2}
          />
        </div>
        
        <Link 
          to={`/teams/${ranking.teamId}`}
          className="flex items-center gap-2 mt-2 group"
        >
          <TeamLogo
            imageUrl={ranking.logoUrl || ranking.imageUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
              {ranking.teamName}
            </h3>
            {showDivision && ranking.divisionName && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {ranking.divisionName}
              </p>
            )}
          </div>
        </Link>

        <div className="flex justify-between mt-2 text-xs">
          <span className="text-gray-600 dark:text-gray-400">
            {ranking.wins}-{ranking.losses}
          </span>
          <span className={cn("font-medium", getPowerScoreColor(ranking.powerScore))}>
            {formatPowerScore(ranking.powerScore)}
          </span>
        </div>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Win %</p>
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
                <p className="text-gray-600 dark:text-gray-400">SOS</p>
                <p className={cn("font-bold", getSosColor(ranking.sos || 0))}>
                  {(ranking.sos || 0).toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900 dark:text-white whitespace-nowrap">
            {formatRankDisplay()}
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
          {showDivision && ranking.divisionName ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ranking.divisionName}
            </p>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {ranking.divisionName}
            </p>
          )}
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
            {formatPowerScore(ranking.powerScore)}
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
