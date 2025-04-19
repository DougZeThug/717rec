
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Ranking } from "@/types";
import HeadToHeadRecords from "./HeadToHeadRecords";
import RankTrendIndicator from "./RankTrendIndicator";
import { formatPowerScore, getPowerScoreColor } from "@/utils/teamDetailsUtils/powerScoreUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import { getRowInteractionStyles } from "@/styles/interactionUtils";
import { cn } from "@/lib/utils";
import { RankNumber } from "./rank/RankNumber";
import { TeamLogo } from "./rank/TeamLogo";
import { TeamStatsGrid } from "./rank/TeamStatsGrid";
import { Info } from "lucide-react";

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
  const isMobile = useIsMobile();
  const isExpanded = expandedTeam === ranking.teamId && !compactView;
  const powerScoreColor = getPowerScoreColor(ranking.powerScore);
  
  const getTrendDescription = () => {
    if (!ranking.rankChange) return "No change";
    const direction = ranking.rankChange > 0 ? "up" : "down";
    const amount = Math.abs(ranking.rankChange);
    return `${direction} ${amount} ${amount === 1 ? 'spot' : 'spots'}`;
  };

  const PowerScoreInfo = () => {
    if (isMobile) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Info 
              className="h-4 w-4 text-muted-foreground cursor-pointer" 
              role="button"
              aria-label="Power Score information"
            />
          </PopoverTrigger>
          <PopoverContent side="top" className="max-w-[300px] text-xs">
            Power Score combines win percentage (40%), strength of schedule (40%), and game win rate (20%) 
            into a single rating from 0-100. Higher scores indicate stronger overall performance.
          </PopoverContent>
        </Popover>
      );
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info 
              className="h-4 w-4 text-muted-foreground cursor-help" 
              role="button"
              aria-label="Power Score information"
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px] text-xs">
            Power Score combines win percentage (40%), strength of schedule (40%), and game win rate (20%) 
            into a single rating from 0-100. Higher scores indicate stronger overall performance.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  const cardClasses = !compactView 
    ? getRowInteractionStyles("border rounded-lg overflow-hidden")
    : "border rounded-lg overflow-hidden";
  
  return (
    <Collapsible
      className={cardClasses}
      open={isExpanded}
      onOpenChange={() => !compactView && onToggleExpand(ranking.teamId)}
    >
      <div className={cn(
        `p-3 bg-white ${compactView ? 'py-2' : ''}`,
        !compactView && "cursor-pointer"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <RankNumber index={index} />
            <TeamLogo imageUrl={ranking.imageUrl} teamName={ranking.teamName} />
            <div className="flex items-center space-x-1">
              <span className="font-medium">{ranking.teamName}</span>
              {!compactView && (
                isExpanded ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-1">
              <PowerScoreInfo />
              <div className={`text-sm ${powerScoreColor} font-semibold`}>
                {formatPowerScore(ranking.powerScore)}
              </div>
            </div>
          </div>
        </div>

        <TeamStatsGrid
          wins={ranking.wins}
          losses={ranking.losses}
          winPercentage={ranking.winPercentage}
          gamesWon={ranking.gamesWon}
          gamesLost={ranking.gamesLost}
          gameWinPercentage={ranking.gameWinPercentage}
          sos={ranking.sos}
          streak={ranking.streak || "—"}  // Convert undefined to a dash if needed
          compactView={compactView}
        />
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
