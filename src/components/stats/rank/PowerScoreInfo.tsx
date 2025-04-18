
import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

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
          Power Score combines win percentage (50%), game win rate (30%), and strength of schedule (20%) 
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
          Power Score combines win percentage (50%), game win rate (30%), and strength of schedule (20%) 
          into a single rating from 0-100. Higher scores indicate stronger overall performance.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
