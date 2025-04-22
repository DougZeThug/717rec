
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { getSosColor } from "@/utils/powerScore/getSosColor";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showDivision?: boolean;
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({
  ranking,
  index,
  isExpanded,
  onToggleExpand,
  showDivision = false
}) => {
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  const sosColor = getSosColor(ranking.sos);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Enhanced power score inline color for better visibility in light mode
  const getPowerScoreInlineColor = (score: number) => {
    if (score >= 80) return isLight ? '#45c47e' : '';
    if (score >= 70) return isLight ? '#3887e6' : '';
    if (score >= 50) return isLight ? '#e8a228' : ''; 
    return isLight ? '#e13d3d' : '';
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/40' : ''}`}
      onClick={onToggleExpand}
    >
      <TableCell
        className="font-medium"
        style={isLight ? { color: "#222222" } : {}}
      >
        {/* Display overall rank and division rank if available */}
        <div className="flex items-center">
          <span className="font-mono">{index + 1}</span>
          {!showDivision && ranking.divisionRank && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400 font-inter">
              ({ranking.divisionRank})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Link 
          to={`/teams/${ranking.teamId}`}
          className="hover:text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
          style={isLight ? { color: "#111111", fontWeight: 600 } : {}}
        >
          {ranking.teamName}
        </Link>
      </TableCell>
      {showDivision && (
        <TableCell>
          <Badge
            variant={ranking.divisionName?.toLowerCase() as any || "default"}
            className="font-normal"
            style={isLight ? { color: "#111111" } : {}}
          >
            {ranking.divisionName || "Unassigned"}
          </Badge>
        </TableCell>
      )}
      <TableCell
        className={`text-center font-mono ${!isLight && powerScoreColor}`}
        style={{ color: isLight ? getPowerScoreInlineColor(ranking.powerScore) : undefined }}
      >
        {formatPowerScore(ranking.powerScore)}
      </TableCell>
      <TableCell className="text-center font-mono" style={isLight ? { color: "#222222" } : {}}>
        {`${ranking.wins}-${ranking.losses}`}
      </TableCell>
      <TableCell className="text-center font-mono" style={isLight ? { color: "#222222" } : {}}>
        {(ranking.winPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center hidden md:table-cell font-mono" style={isLight ? { color: "#222222" } : {}}>
        {`${ranking.gamesWon}-${ranking.gamesLost}`}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell font-mono" style={isLight ? { color: "#222222" } : {}}>
        {(ranking.gameWinPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center font-mono">
        <span className={sosColor} style={isLight ? { color: isLight && sosColor ? sosColor.replace('text-', '').replace('-500', '') : "#222222" } : {}}>
          {ranking.sos.toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono" style={isLight ? { color: "#222222" } : {}}>
        {ranking.streak || '-'}
      </TableCell>
      <TableCell className="text-center">
        <RankTrendIndicator rankChange={ranking.rankChange} />
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
