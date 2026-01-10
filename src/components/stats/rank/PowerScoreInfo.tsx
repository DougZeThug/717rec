import { Info } from 'lucide-react';
import React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

export const PowerScoreInfo = () => {
  const isMobile = useIsMobile();

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
          Power Score combines match win percentage (40%), strength of schedule (45%), and game win
          percentage (15%) into a single rating from 0-100. Higher scores indicate stronger overall
          performance.
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
          Power Score combines match win percentage (40%), strength of schedule (45%), and game win
          percentage (15%) into a single rating from 0-100. Higher scores indicate stronger overall
          performance.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
