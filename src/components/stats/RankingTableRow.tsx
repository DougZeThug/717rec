
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { getSosColor } from "@/utils/powerScore/getSosColor";
import { TransitionLink } from "@/components/transitions/TransitionLink";

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
  const handleTeamLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <TableRow 
      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${isExpanded ? 'bg-gray-50 dark:bg-gray-800/40' : ''}`}
      onClick={onToggleExpand}
    >
      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
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
        <TransitionLink 
          to={`/teams/${ranking.teamId}`}
          className="flex items-center space-x-2 font-bebas tracking-wide uppercase group"
          onClick={handleTeamLinkClick}
        >
          {/* Logo section */}
          {(ranking.logoUrl || ranking.imageUrl) && (
            <div className="w-8 h-8 flex-shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <img
                src={ranking.logoUrl || ranking.imageUrl}
                alt={`${ranking.teamName} logo`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <span className="group-hover:text-blue-600 transition-colors">
            {ranking.teamName}
          </span>
        </TransitionLink>
      </TableCell>
      {showDivision && (
        <TableCell>
          <Badge
            variant={ranking.divisionName?.toLowerCase() as any || "default"}
            className="font-normal text-gray-900 dark:text-gray-100"
          >
            {ranking.divisionName || "Unassigned"}
          </Badge>
        </TableCell>
      )}
      <TableCell className="text-center font-mono">
        <span className={getPowerScoreColor(ranking.powerScore)}>
          {formatPowerScore(ranking.powerScore)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono text-gray-900 dark:text-gray-100">
        {`${ranking.wins}-${ranking.losses}`}
      </TableCell>
      <TableCell className="text-center font-mono text-gray-900 dark:text-gray-100">
        {(ranking.winPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center hidden md:table-cell font-mono text-gray-900 dark:text-gray-100">
        {`${ranking.gamesWon}-${ranking.gamesLost}`}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell font-mono text-gray-900 dark:text-gray-100">
        {(ranking.gameWinPercentage * 100).toFixed(1)}%
      </TableCell>
      <TableCell className="text-center font-mono">
        <span className={getSosColor(ranking.sos)}>
          {ranking.sos.toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-center font-mono text-gray-900 dark:text-gray-100">
        {ranking.streak || '-'}
      </TableCell>
      <TableCell className="text-center">
        <RankTrendIndicator rankChange={ranking.rankChange} />
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
