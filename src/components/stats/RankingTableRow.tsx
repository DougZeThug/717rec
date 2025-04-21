
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { Link } from "react-router-dom";

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

  // Helper to choose fallback logo if missing
  const getLogoUrl = (team: Ranking) =>
    team.logoUrl || team.imageUrl || '/default-logo.png';

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-gray-50 ${isExpanded ? 'bg-gray-50' : ''}`}
      onClick={onToggleExpand}
    >
      <TableCell className="font-medium">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-3">
          <img
            src={getLogoUrl(ranking)}
            alt={ranking.teamName}
            className="w-8 h-8 rounded-full object-contain bg-gray-100"
          />
          <Link 
            to={`/teams/${ranking.teamId}`}
            className="hover:text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {ranking.teamName}
          </Link>
        </div>
      </TableCell>
      {showDivision && (
        <TableCell>
          <Badge
            variant={ranking.divisionName?.toLowerCase() as any || "default"}
            className="font-normal"
          >
            {ranking.divisionName || "Unassigned"}
          </Badge>
        </TableCell>
      )}
      <TableCell className={`text-center ${powerScoreColor}`}>
        {formatPowerScore(ranking.powerScore)}
      </TableCell>
      <TableCell className="text-center">{`${ranking.wins}-${ranking.losses}`}</TableCell>
      <TableCell className="text-center">{(ranking.winPercentage * 100).toFixed(1)}%</TableCell>
      <TableCell className="text-center hidden md:table-cell">
        {`${ranking.gamesWon}-${ranking.gamesLost}`}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        {(ranking.gameWinPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center">{ranking.sos.toFixed(3)}</TableCell>
      <TableCell className="text-center">
        {ranking.streak || '-'}
      </TableCell>
      <TableCell className="text-center">
        <RankTrendIndicator rankChange={ranking.rankChange} />
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
