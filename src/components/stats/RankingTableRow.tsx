import React from "react";
import { cn } from "@/lib/utils";
import { Ranking } from "@/types";
import { Link } from "react-router";
import { TeamLogo } from "@/components/shared/TeamLogo";
import RankTrendIndicator from "./RankTrendIndicator";
import TeamBadgeCollection from "@/components/badges/TeamBadgeCollection";
import { getPowerScoreColor, getSosColor, formatPowerScore } from "@/utils/colors";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

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
  const { isWinterTheme } = useSeasonalTheme();
  const globalRank = index + 1;
  const divisionRank = ranking.divisionRank;
  const winPercentage = ranking.winPercentage * 100;
  const gameWinPercentage = (ranking.gameWinPercentage || 0) * 100;

  // Text color based on theme
  const textColor = isWinterTheme ? "text-card-foreground" : "text-slate-900 dark:text-white";

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onToggleExpand && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onToggleExpand();
    }
  };

  return (
    <tr 
      className={cn(
        "border-b transition-colors",
        isWinterTheme 
          ? "border-frost-border/20 even:bg-white/5 hover:bg-white/10" 
          : "border-gray-100 dark:border-slate-700 even:bg-gray-50 dark:even:bg-white/5 hover:bg-gray-50 dark:hover:bg-slate-700/50",
        isExpanded && (isWinterTheme ? "bg-frost-primary/20" : "bg-blue-50 dark:bg-blue-900/20"),
        onToggleExpand && "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
      )}
      onClick={onToggleExpand}
      onKeyDown={handleKeyDown}
      role={onToggleExpand ? "button" : undefined}
      tabIndex={onToggleExpand ? 0 : undefined}
      style={{ cursor: onToggleExpand ? 'pointer' : 'default' }}
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium min-w-[3rem] whitespace-nowrap", textColor)}>
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
          className={cn(
            "flex items-center gap-3 transition-colors group",
            isWinterTheme 
              ? "hover:text-frost-primary" 
              : "hover:text-blue-600 dark:hover:text-blue-400"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <TeamLogo
            imageUrl={ranking.imageUrl || ranking.logoUrl}
            teamName={ranking.teamName}
            size="sm"
            className="flex-shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className={cn(
              "font-medium truncate",
              textColor,
              isWinterTheme 
                ? "group-hover:text-frost-primary" 
                : "group-hover:text-blue-600 dark:group-hover:text-blue-400"
            )}>
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
        <td className={cn("py-3 px-3 text-center", textColor)}>
          {ranking.divisionName || 'N/A'}
        </td>
      )}
      <td className="py-3 px-3 text-center">
        <span className={cn("font-medium tabular-nums", getPowerScoreColor(ranking.powerScore))}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </td>
      <td className={cn("py-3 px-3 text-center font-medium tabular-nums", textColor)}>
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
      <td className={cn("py-3 px-3 text-center font-medium tabular-nums hidden md:table-cell", textColor)}>
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
      <td className={cn("py-3 px-3 text-center font-medium tabular-nums", textColor)}>
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
