
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid2X2, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TeamsHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const TeamsHeader: React.FC<TeamsHeaderProps> = ({ 
  onRefresh = () => {},
  isRefreshing = false,
  viewMode = 'list',
  onViewModeChange = () => {}
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <div className="flex bg-muted dark:bg-gray-800 dark:border dark:border-gray-700 rounded-md p-0.5 gap-1 shadow-sm">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                variant="outline"
                size="sm"
                pressed={viewMode === 'list'}
                onPressedChange={() => onViewModeChange('list')}
                className={cn(
                  "px-2 py-1 text-sm rounded-md",
                  viewMode === 'list'
                    ? "data-[state=on]:bg-white data-[state=on]:dark:bg-gray-700 data-[state=on]:dark:text-white"
                    : "data-[state=off]:bg-transparent dark:text-gray-300"
                )}
                aria-label="List view"
              >
                <List size={16} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p>List View</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                variant="outline"
                size="sm"
                pressed={viewMode === 'grid'}
                onPressedChange={() => onViewModeChange('grid')}
                className={cn(
                  "px-2 py-1 text-sm rounded-md",
                  viewMode === 'grid'
                    ? "data-[state=on]:bg-white data-[state=on]:dark:bg-gray-700 data-[state=on]:dark:text-white"
                    : "data-[state=off]:bg-transparent dark:text-gray-300"
                )}
                aria-label="Grid view"
              >
                <Grid2X2 size={16} />
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              <p>Grid View</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              onClick={onRefresh} 
              variant="outline"
              disabled={isRefreshing}
              className="h-8 px-2 py-1 text-sm rounded-md dark:border-gray-600"
              size="sm"
            >
              <RefreshCw size={15} className={isRefreshing ? "animate-spin" : ""} />
              {!isMobile && <span className="ml-2">{isRefreshing ? "Refreshing..." : "Refresh"}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh Teams</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
