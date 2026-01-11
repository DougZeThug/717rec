import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { TeamLogo } from './TeamLogo';

interface TeamCellProps {
  teamName: string;
  teamId: string;
  imageUrl: string | null | undefined;
  isExpanded: boolean;
  gameWins?: number;
  gameLosses?: number;
}

export const TeamCell: React.FC<TeamCellProps> = ({
  teamName,
  teamId,
  imageUrl,
  isExpanded,
  gameWins,
  gameLosses,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center space-x-3">
            <TeamLogo imageUrl={imageUrl} teamName={teamName} teamId={teamId} clickable />
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
