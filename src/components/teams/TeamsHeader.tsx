
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid2X2, List, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sticky top-0 z-10 
      pt-2 pb-3 bg-background/95 backdrop-blur-sm">
      <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <div className="flex bg-muted rounded-md p-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Toggle
                  variant="outline" 
                  size="sm"
                  pressed={viewMode === 'list'}
                  onPressedChange={() => onViewModeChange('list')}
                  className="data-[state=on]:bg-white data-[state=off]:bg-transparent dark:data-[state=on]:bg-gray-800"
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
                  className="data-[state=on]:bg-white data-[state=off]:bg-transparent dark:data-[state=on]:bg-gray-800"
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
                className="h-9 px-2 sm:px-3"
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
    </div>
  );
};
