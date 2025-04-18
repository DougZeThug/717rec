
import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TeamLogo } from "./TeamLogo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TeamCellProps {
  teamName: string;
  imageUrl: string | null | undefined;
  isExpanded: boolean;
  gameWins?: number;
  gameLosses?: number;
}

export const TeamCell: React.FC<TeamCellProps> = ({ 
  teamName, 
  imageUrl, 
  isExpanded,
  gameWins,
  gameLosses
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-3">
            <TeamLogo imageUrl={imageUrl} teamName={teamName} />
            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="font-medium">{teamName}</span>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-gray-500" />
                ) : (
                  <ChevronDown size={16} className="text-gray-500" />
                )}
              </div>
              <div className="text-xs text-gray-500">
                Games: {gameWins ?? 0}–{gameLosses ?? 0}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Game Record: {gameWins ?? 0}-{gameLosses ?? 0}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
