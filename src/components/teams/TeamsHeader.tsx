
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid2X2, List, ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TeamsHeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export const TeamsHeader: React.FC<TeamsHeaderProps> = ({ 
  onRefresh,
  isRefreshing,
  viewMode,
  onViewModeChange
}) => {
  const isMobile = useIsMobile();

  return (
    <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sticky top-0 z-10 
      pt-2 pb-4 bg-background transition-shadow backdrop-blur-sm`}>
      <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
      <div className="flex flex-wrap items-center gap-2">
        <TooltipProvider>
          <div className="flex bg-muted rounded-md p-1 mr-2">
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
                  <List size={isMobile ? 16 : 18} />
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
                  <Grid2X2 size={isMobile ? 16 : 18} />
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
                className="flex items-center gap-1 h-9 px-2 sm:px-3"
                size={isMobile ? "sm" : "default"}
              >
                <RefreshCw size={isMobile ? 15 : 16} className={isRefreshing ? "animate-spin" : ""} /> 
                {!isMobile && (isRefreshing ? "Refreshing..." : "Refresh")}
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
