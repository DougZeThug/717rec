
import React from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Grid2X2, List } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toggle } from "@/components/ui/toggle";

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
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-muted rounded-md p-1 mr-2">
          <Toggle
            variant="outline" 
            size="sm"
            pressed={viewMode === 'list'}
            onPressedChange={() => onViewModeChange('list')}
            className="data-[state=on]:bg-white data-[state=off]:bg-transparent"
            aria-label="List view"
          >
            <List size={18} />
          </Toggle>
          <Toggle
            variant="outline"
            size="sm"
            pressed={viewMode === 'grid'}
            onPressedChange={() => onViewModeChange('grid')}
            className="data-[state=on]:bg-white data-[state=off]:bg-transparent"
            aria-label="Grid view"
          >
            <Grid2X2 size={18} />
          </Toggle>
        </div>

        <Button 
          onClick={onRefresh} 
          variant="outline"
          disabled={isRefreshing}
          className="flex items-center gap-2"
          size={isMobile ? "sm" : "default"}
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} /> 
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
    </div>
  );
};
