
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/powerScore";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RankNumber } from "./rank/RankNumber";
import { TeamCell } from "./rank/TeamCell";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const navigate = useNavigate();

  // Format win percentage to display with correct precision
  const formatWinPercentage = (percentage: number) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return "0.0%";
    }
    return `${(percentage * 100).toFixed(1)}%`;
  };

  // Get the power score color using the database-calculated value
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  
  // Get the trend description
  const getTrendDescription = () => {
    if (!ranking.rankChange) return "No change";
    const direction = ranking.rankChange > 0 ? "up" : "down";
    const amount = Math.abs(ranking.rankChange);
    return `${direction} ${amount} ${amount === 1 ? 'spot' : 'spots'}`;
  };

  // Handle row click
  const handleRowClick = (e: React.MouseEvent) => {
    // Prevent expanding if clicking the team name/cell
    if ((e.target as HTMLElement).closest('[data-team-cell="true"]')) {
      e.stopPropagation();
      navigate(`/teams/${ranking.teamId}`);
    } else {
      onToggleExpand();
    }
  };

  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-gray-100",
        "[&_[data-team-cell]]:hover:text-blue-600 [&_[data-team-cell]]:hover:underline"
      )}
      onClick={handleRowClick}
    >
      <TableCell>
        <RankNumber index={index} />
      </TableCell>
      <TableCell data-team-cell="true">
        <TeamCell
          teamName={ranking.teamName}
          imageUrl={ranking.imageUrl}
          isExpanded={isExpanded}
          gameWins={ranking.gamesWon}
          gameLosses={ranking.gamesLost}
        />
      </TableCell>
      <TableCell className="text-center">
        <div className={`text-sm ${powerScoreColor} font-semibold`}>
          {formatPowerScore(ranking.powerScore)}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {ranking.wins}-{ranking.losses}
      </TableCell>
      <TableCell className="text-center">
        {formatWinPercentage(ranking.winPercentage)}
      </TableCell>
      <TableCell className="text-center hidden md:table-cell">
        {ranking.gamesWon ?? 0}–{ranking.gamesLost ?? 0}
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        {formatWinPercentage(ranking.gameWinPercentage)}
      </TableCell>
      <TableCell className="text-center">
        {(ranking.sos || 0).toFixed(3)}
      </TableCell>
      <TableCell className="text-center">{ranking.streak || "—"}</TableCell>
      <TableCell className="text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <RankTrendIndicator rankChange={ranking.rankChange} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">{getTrendDescription()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
};

export default RankingTableRow;
