
import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Ranking } from "@/types";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/teamDetailsUtils/powerScoreUtils";
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
  // Function to get rank styling
  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-amber-100 text-amber-800 font-bold"; // Gold
    if (index === 1) return "bg-slate-100 text-slate-700 font-bold"; // Silver
    if (index === 2) return "bg-orange-100 text-orange-800 font-bold"; // Bronze
    return "";
  };

  // Calculate the trend description
  const getTrendDescription = () => {
    if (!ranking.rankChange) return "No change";
    const direction = ranking.rankChange > 0 ? "up" : "down";
    const amount = Math.abs(ranking.rankChange);
    return `${direction} ${amount} ${amount === 1 ? 'spot' : 'spots'}`;
  };

  // Format win percentage to display with correct precision
  const formatWinPercentage = (percentage: number) => {
    // Ensure the percentage is a valid number
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return "0.0%";
    }
    // Format as percentage with one decimal place
    return `${(percentage * 100).toFixed(1)}%`;
  };

  // Use the power score color
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  
  // Log the ranking data for debugging
  console.log(`Rendering rank #${index + 1}: ${ranking.teamName} (${ranking.wins}-${ranking.losses}, Win%: ${ranking.winPercentage}, Power: ${ranking.powerScore})`);

  return (
    <TableRow
      className="cursor-pointer hover:bg-gray-100"
      onClick={onToggleExpand}
    >
      <TableCell className={`font-medium ${getRankStyles(index)}`}>
        <div className="w-8 h-8 flex items-center justify-center rounded-full">
          {index + 1}
        </div>
      </TableCell>
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
      <TableCell className={`text-center font-semibold ${powerScoreColor}`}>
        {formatPowerScore(ranking.powerScore)}
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
