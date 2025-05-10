
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { formatPowerScore, getPowerScoreColor } from "@/utils/colors";
import { getSosColor } from "@/utils/colors";
import RankTrendIndicator from "./RankTrendIndicator";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDivision?: boolean;
  rowIndex?: number;
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({ 
  ranking, 
  index,
  rowIndex = 0, 
  isExpanded, 
  onToggleExpand,
  showDivision = false
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Get appropriate styles based on ranking position
  const getRankStyles = () => {
    if (isLight) {
      if (index === 0) return "bg-gradient-to-r from-amber-100 to-amber-200/80 font-bold text-gray-900";
      if (index === 1) return "bg-gradient-to-r from-slate-100 to-blue-100/70 font-bold text-gray-900";
      if (index === 2) return "bg-gradient-to-r from-orange-100/90 to-orange-200/70 font-bold text-gray-900";
      return "font-mono font-bold";
    } else {
      if (index === 0) return "bg-gradient-to-r from-amber-900/30 to-amber-800/20 font-bold text-white";
      if (index === 1) return "bg-gradient-to-r from-slate-800/30 to-blue-900/20 font-bold text-white";
      if (index === 2) return "bg-gradient-to-r from-orange-900/30 to-orange-800/20 font-bold text-white";
      return "font-mono font-bold";
    }
  };
  
  // Get row styling for alternating rows and highlights
  const getRowStyles = () => {
    let baseStyles = cn(
      "cursor-pointer border-b hover:bg-blue-50/50 dark:hover:bg-blue-900/10",
      isExpanded ? "bg-blue-50/80 dark:bg-blue-900/20" : "",
      index < 3 ? "shadow-sm" : "",
      index === 0 ? "border-l-4 border-amber-400 dark:border-amber-600" : "",
      index === 1 ? "border-l-4 border-blue-400 dark:border-blue-600" : "",
      index === 2 ? "border-l-4 border-orange-400 dark:border-orange-600" : "",
    );
    
    // Add alternating row colors
    if (rowIndex % 2 === 0) {
      baseStyles = cn(baseStyles, isLight ? "bg-white" : "bg-gray-800/70");
    } else {
      baseStyles = cn(baseStyles, isLight ? "bg-blue-50/30" : "bg-gray-800/40");
    }
    
    return baseStyles;
  };

  return (
    <TableRow 
      className={getRowStyles()}
      onClick={onToggleExpand}
    >
      <TableCell className={getRankStyles()}>
        <div className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full",
          index < 3 ? "shadow-inner" : ""
        )}>
          {index + 1}
          {ranking.divisionRank && !showDivision && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              ({ranking.divisionRank})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Link 
          to={`/teams/${ranking.teamId}`}
          className="flex items-center space-x-2 hover:text-blue-600 dark:hover:text-blue-400"
          onClick={(e) => e.stopPropagation()}
        >
          {ranking.logoUrl || ranking.imageUrl ? (
            <img 
              src={ranking.logoUrl || ranking.imageUrl} 
              alt={ranking.teamName} 
              className={cn(
                "w-6 h-6 object-contain",
                "border border-gray-200 dark:border-gray-700 rounded-md",
                "bg-white dark:bg-gray-800"
              )}
            />
          ) : null}
          <span className={cn(
            "font-bebas tracking-wide",
            index < 3 ? "text-lg" : "text-base"
          )}>
            {ranking.teamName}
          </span>
        </Link>
      </TableCell>
      {showDivision && (
        <TableCell>{ranking.divisionName || "Unassigned"}</TableCell>
      )}
      <TableCell className="text-center">
        <span className={cn(
          getPowerScoreColor(ranking.powerScore),
          index < 3 ? "px-2 py-0.5 rounded bg-gradient-to-r from-transparent to-blue-50/70 dark:to-blue-900/10" : "",
        )}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono">{`${ranking.wins}-${ranking.losses}`}</TableCell>
      <TableCell className="text-center font-mono">{(ranking.winPercentage * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center font-mono hidden md:table-cell">{`${ranking.gamesWon}-${ranking.gamesLost}`}</TableCell>
      <TableCell className="text-center font-mono hidden lg:table-cell">{(ranking.gameWinPercentage * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center">
        <span className={cn(
          getSosColor(ranking.sos),
          index < 3 ? "px-2 py-0.5 rounded bg-gradient-to-r from-transparent to-orange-50/70 dark:to-orange-900/10" : "",
        )}>
          {ranking.sos.toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono">{ranking.streak || "-"}</TableCell>
      <TableCell className="text-center">
        <RankTrendIndicator rankChange={ranking.rankChange} />
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
