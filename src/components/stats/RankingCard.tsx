
import React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Ranking } from "@/types";
import HeadToHeadRecords from "./HeadToHeadRecords";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  expandedTeam: string | null;
  onToggleExpand: (teamId: string) => void;
  compactView?: boolean;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  expandedTeam,
  onToggleExpand,
  compactView = false,
}) => {
  // Function to get rank styling
  const getRankStyles = (index: number) => {
    if (index === 0) return "bg-amber-100 text-amber-800 font-bold"; // Gold
    if (index === 1) return "bg-slate-100 text-slate-700 font-bold"; // Silver
    if (index === 2) return "bg-orange-100 text-orange-800 font-bold"; // Bronze
    return "bg-gray-50 text-gray-700";
  };
  
  // Calculate the trend description
  const getTrendDescription = () => {
    if (!ranking.rankChange) return "No change";
    const direction = ranking.rankChange > 0 ? "up" : "down";
    const amount = Math.abs(ranking.rankChange);
    return `${direction} ${amount} ${amount === 1 ? 'spot' : 'spots'}`;
  };

  // Use the power score color for highlighting
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  
  return (
    <Collapsible
      key={ranking.teamId}
      className="border rounded-lg overflow-hidden"
      open={expandedTeam === ranking.teamId && !compactView}
      onOpenChange={() => !compactView && onToggleExpand(ranking.teamId)}
    >
      <div className={`p-3 bg-white ${compactView ? 'py-2' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-7 h-7 flex items-center justify-center rounded-full ${getRankStyles(index)}`}>
              {index + 1}
            </div>
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
            <span className="font-medium">{ranking.teamName}</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`text-sm ${powerScoreColor} font-semibold`}>
              {formatPowerScore(ranking.powerScore)}
            </div>
            {!compactView && (
              <CollapsibleTrigger className="p-2">
                <ChevronDown className="h-4 w-4" />
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        {compactView ? (
          <div className="flex justify-between mt-2 text-sm">
            <div className="text-gray-700">
              <span>{ranking.wins}-{ranking.losses}</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">Record</div>
              <div>
                {ranking.wins}-{ranking.losses}
              </div>
            </div>
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">Win %</div>
              <div>{(ranking.winPercentage * 100).toFixed(1)}%</div>
            </div>
            
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">Games</div>
              <div>{ranking.gamesWon || 0}-{ranking.gamesLost || 0}</div>
            </div>
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">Game Win %</div>
              <div>
                {ranking.gameWinPercentage !== undefined
                  ? (ranking.gameWinPercentage * 100).toFixed(1) + "%"
                  : "—"}
              </div>
            </div>
            
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">SOS</div>
              <div>{(ranking.sos || 0).toFixed(3)}</div>
            </div>
            <div className="p-1.5 bg-gray-50 rounded text-center">
              <div className="text-gray-500 text-xs">Streak</div>
              <div>{ranking.streak || "—"}</div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-1.5 bg-gray-50 rounded text-center col-span-2">
                    <div className="text-gray-500 text-xs">Trend</div>
                    <div className="flex justify-center">
                      <RankTrendIndicator rankChange={ranking.rankChange} />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{getTrendDescription()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {!compactView && (
        <CollapsibleContent className="bg-gray-50 p-3 border-t">
          <HeadToHeadRecords headToHead={ranking.headToHead} />
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default RankingCard;
