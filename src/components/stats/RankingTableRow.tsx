import React from "react";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { TeamLogo } from "@/components/shared/TeamLogo";
import RankTrendIndicator from "./RankTrendIndicator";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { getPowerScoreColor, getSosColor, formatPowerScore } from "@/utils/colors";

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  showRankChange?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  showDivision?: boolean;
  rowIndex?: number;
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({ 
  ranking, 
  index, 
  showRankChange = true,
  isExpanded = false,
  onToggleExpand,
  showDivision = false,
  rowIndex
}) => {
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;

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

  return (
    <tr 
      className={cn(
        "border-b border-gray-100 dark:border-slate-700 transition-colors",
        "even:bg-gray-50 dark:even:bg-white/5",
        "hover:bg-gray-50 dark:hover:bg-slate-700/50",
        isExpanded && "bg-blue-50 dark:bg-blue-900/20"
      )}
      onClick={onToggleExpand}
      style={{ cursor: onToggleExpand ? 'pointer' : 'default' }}
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900 dark:text-white min-w-[3rem] whitespace-nowrap">
            {formatRankDisplay()}
          </span>
          {showRankChange && (
            <RankTrendIndicator rankChange={ranking.rankChange} />
          )}
        </div>
      </td>
      <td className="py-3 px-3">
        <Link 
          to={`/teams/${ranking.teamId}`}
          className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 transition-colors group"
          onClick={(e) => e.stopPropagation()}
        >
          <TeamLogo
            imageUrl={ranking.imageUrl || ranking.logoUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
              {ranking.teamName}
            </span>
            <TeamBadgeCollection 
              teamId={ranking.teamId}
              size="sm"
              maxDisplay={4}
              className="mt-1"
            />
          </div>
        </Link>
      </td>
      {showDivision && (
        <td className="py-3 px-3 text-center text-slate-900 dark:text-white">
          {ranking.divisionName || 'N/A'}
        </td>
      )}
      <td className="py-3 px-3 text-center">
        <span className={cn("font-medium tabular-nums", getPowerScoreColor(ranking.powerScore))}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </td>
      <td className="py-3 px-3 text-center font-medium tabular-nums text-slate-900 dark:text-white">
        {ranking.wins}-{ranking.losses}
      </td>
      <td className="py-3 px-3 text-center">
        <span className={cn(
          "font-medium tabular-nums",
          winPercentage >= 75 ? "text-green-600 dark:text-green-500" :
          winPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
          winPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
          "text-red-600 dark:text-red-500"
        )}>
          {winPercentage.toFixed(1)}%
        </span>
      </td>
      <td className="py-3 px-3 text-center font-medium tabular-nums text-slate-900 dark:text-white hidden md:table-cell">
        {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
      </td>
      <td className="py-3 px-3 text-center hidden lg:table-cell">
        <span className={cn(
          "font-medium tabular-nums",
          gameWinPercentage >= 75 ? "text-green-600 dark:text-green-500" :
          gameWinPercentage >= 60 ? "text-blue-600 dark:text-blue-500" :
          gameWinPercentage >= 40 ? "text-orange-500 dark:text-orange-400" :
          "text-red-600 dark:text-red-500"
        )}>
          {gameWinPercentage.toFixed(1)}%
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={cn("font-medium tabular-nums", getSosColor(ranking.sos || 0))}>
          {(ranking.sos || 0).toFixed(3)}
        </span>
      </td>
      <td className="py-3 px-3 text-center font-medium tabular-nums text-slate-900 dark:text-white">
        {ranking.streak || 'N/A'}
      </td>
      <td className="py-3 px-3 text-center">
        {showRankChange && ranking.rankChange !== undefined && ranking.rankChange !== 0 && (
          <RankTrendIndicator rankChange={ranking.rankChange} />
        )}
      </td>
    </tr>
  );
};

export default RankingTableRow;
