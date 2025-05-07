
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Ranking } from "@/types";
import { Link } from "react-router-dom";
import { formatPowerScore, getPowerScoreColor } from "@/utils/colors";
import { getSosColor } from "@/utils/colors";
import RankTrendIndicator from "./RankTrendIndicator";

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
  // Add logging to debug
  React.useEffect(() => {
    console.log(`Desktop team ${ranking.teamName} rank change:`, ranking.rankChange);
  }, [ranking.teamName, ranking.rankChange]);

  return (
    <TableRow 
      className={`cursor-pointer border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
      onClick={onToggleExpand}
    >
      <TableCell className="font-mono font-bold">
        {index + 1}
        {ranking.divisionRank && !showDivision && (
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ({ranking.divisionRank})
          </span>
        )}
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
              className="w-6 h-6 object-contain"
            />
          ) : null}
          <span className="font-bebas tracking-wide text-lg">{ranking.teamName}</span>
        </Link>
      </TableCell>
      {showDivision && (
        <TableCell>{ranking.divisionName || "Unassigned"}</TableCell>
      )}
      <TableCell className="text-center">
        <span className={getPowerScoreColor(ranking.powerScore)}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono">{`${ranking.wins}-${ranking.losses}`}</TableCell>
      <TableCell className="text-center font-mono">{(ranking.winPercentage * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center font-mono hidden md:table-cell">{`${ranking.gamesWon}-${ranking.gamesLost}`}</TableCell>
      <TableCell className="text-center font-mono hidden lg:table-cell">{(ranking.gameWinPercentage * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center">
        <span className={getSosColor(ranking.sos)}>
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
