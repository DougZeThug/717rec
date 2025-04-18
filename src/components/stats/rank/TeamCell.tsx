
import React, { useEffect } from "react";
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
  // Add debug logging to verify the props
  useEffect(() => {
    console.log(`TeamCell for ${teamName} - Game Stats:`, { 
      gameWins: typeof gameWins === 'undefined' ? 'undefined' : gameWins, 
      gameLosses: typeof gameLosses === 'undefined' ? 'undefined' : gameLosses 
    });
  }, [teamName, gameWins, gameLosses]);
  
  const hasGameStats = typeof gameWins === 'number' && typeof gameLosses === 'number';
  
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
                Games: {typeof gameWins === 'undefined' ? "undefined" : gameWins === null ? "null" : gameWins}–
                {typeof gameLosses === 'undefined' ? "undefined" : gameLosses === null ? "null" : gameLosses}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Game Record: {gameWins ?? 0}-{gameLosses ?? 0}
          <div className="mt-1">
            Types: gameWins ({typeof gameWins}), gameLosses ({typeof gameLosses})
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
