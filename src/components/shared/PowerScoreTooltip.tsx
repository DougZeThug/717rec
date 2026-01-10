import { Info } from 'lucide-react';
import React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

export const PowerScoreTooltip = () => {
  const isMobile = useIsMobile();
  const tooltipText =
    'Power Score is a weighted performance metric calculated as: 40% Match Wins, 45% Strength of Schedule, and 15% Individual Games Won — with all wins scaled based on opponent difficulty.';

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
        <PopoverContent side="top" className="max-w-[300px] text-sm">
          {tooltipText}
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
        <TooltipContent side="top" className="max-w-[300px] text-sm">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default PowerScoreTooltip;
