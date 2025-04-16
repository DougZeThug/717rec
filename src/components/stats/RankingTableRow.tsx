
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";

interface RankingTableRowProps {
  ranking: Ranking;
  index: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const RankingTableRow: React.FC<RankingTableRowProps> = ({
  ranking,
  index,
  isExpanded,
  onToggleExpand,
}) => {
  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-100"
      onClick={onToggleExpand}
    >
      <TableCell className="font-medium">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
            {ranking.imageUrl ? (
              <img
                src={ranking.imageUrl}
                alt={ranking.teamName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                No Logo
              </div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <span className="font-medium">{ranking.teamName}</span>
            {isExpanded ? (
              <ChevronUp size={16} className="text-gray-500" />
            ) : (
              <ChevronDown size={16} className="text-gray-500" />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {ranking.divisionName || "Not Assigned"}
      </TableCell>
      <TableCell className="text-center">
        {ranking.wins}-{ranking.losses}
      </TableCell>
      <TableCell className="text-center">
        {(ranking.winPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center hidden md:table-cell">
        {ranking.gamesWon || 0}-{ranking.gamesLost || 0}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        {ranking.gameWinPercentage !== undefined
          ? (ranking.gameWinPercentage * 100).toFixed(1) + "%"
          : "—"}
      </TableCell>
      <TableCell className="text-center">
        {(ranking.sos || 0).toFixed(3)}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        {ranking.powerScore !== undefined
          ? ranking.powerScore.toFixed(1)
          : "—"}
      </TableCell>
      <TableCell className="text-center">{ranking.streak || "—"}</TableCell>
      <TableCell className="text-center">
        <RankTrendIndicator rankChange={ranking.rankChange} />
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
