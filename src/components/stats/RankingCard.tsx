
import React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Ranking } from "@/types";
import HeadToHeadRecords from "./HeadToHeadRecords";
import RankTrendIndicator from "./RankTrendIndicator";

interface RankingCardProps {
  ranking: Ranking;
  index: number;
  expandedTeam: string | null;
  onToggleExpand: (teamId: string) => void;
}

const RankingCard: React.FC<RankingCardProps> = ({
  ranking,
  index,
  expandedTeam,
  onToggleExpand,
}) => {
  return (
    <Collapsible
      key={ranking.teamId}
      className="border rounded-lg overflow-hidden"
      open={expandedTeam === ranking.teamId}
      onOpenChange={() => onToggleExpand(ranking.teamId)}
    >
      <div className="p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="font-medium text-lg">{index + 1}</div>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
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

          <CollapsibleTrigger className="p-2">
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Record</div>
            <div>
              {ranking.wins}-{ranking.losses}
            </div>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Win %</div>
            <div>{(ranking.winPercentage * 100).toFixed(1)}%</div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Games</div>
            <div>{ranking.gamesWon || 0}-{ranking.gamesLost || 0}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Game Win %</div>
            <div>
              {ranking.gameWinPercentage !== undefined
                ? (ranking.gameWinPercentage * 100).toFixed(1) + "%"
                : "—"}
            </div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">SOS</div>
            <div>{(ranking.sos || 0).toFixed(3)}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Close Losses</div>
            <div>{ranking.closeMatchLosses || 0}</div>
          </div>
          
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Streak</div>
            <div>{ranking.streak || "—"}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded text-center">
            <div className="text-gray-500 text-xs">Trend</div>
            <div className="flex justify-center">
              <RankTrendIndicator rankChange={ranking.rankChange} />
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <div className="text-center">
            {ranking.divisionName || "No Division"} Division
          </div>
        </div>
      </div>

      <CollapsibleContent className="bg-gray-50 p-4 border-t">
        <HeadToHeadRecords headToHead={ranking.headToHead} />
      </CollapsibleContent>
    </Collapsible>
  );
};

export default RankingCard;
