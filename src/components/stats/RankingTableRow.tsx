
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RankNumber } from "./rank/RankNumber";
import { TeamCell } from "./rank/TeamCell";
import { PowerScoreInfo } from "./rank/PowerScoreInfo";

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
  // Format win percentage to display with correct precision
  const formatWinPercentage = (percentage: number) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return "0.0%";
    }
    return `${(percentage * 100).toFixed(1)}%`;
  };

  // Get the power score color
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  
  // Get the trend description
  const getTrendDescription = () => {
    if (!ranking.rankChange) return "No change";
    const direction = ranking.rankChange > 0 ? "up" : "down";
    const amount = Math.abs(ranking.rankChange);
    return `${direction} ${amount} ${amount === 1 ? 'spot' : 'spots'}`;
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-100"
      onClick={onToggleExpand}
    >
      <TableCell>
        <RankNumber index={index} />
      </TableCell>
      <TableCell>
        <TeamCell
          teamName={ranking.teamName}
          imageUrl={ranking.imageUrl}
          isExpanded={isExpanded}
          gameWins={ranking.gamesWon}
          gameLosses={ranking.gamesLost}
        />
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-1">
          <PowerScoreInfo />
          <div className={`text-sm ${powerScoreColor} font-semibold`}>
            {formatPowerScore(ranking.powerScore)}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center">
        {ranking.wins}-{ranking.losses}
      </TableCell>
      <TableCell className="text-center">
        {formatWinPercentage(ranking.winPercentage)}
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
