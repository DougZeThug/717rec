
import React, { useState, useEffect, useCallback } from "react";
import TeamContainer from "./TeamsContainer";
import TeamsHeader from "./TeamsHeader";
import { animations } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import TeamsViewToggle from "./TeamsViewToggle";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { useQueryClient } from "@tanstack/react-query";

export type DisplayMode = 'all' | 'grouped';
export type ViewMode = 'grid' | 'list';

const TeamsPageContainer: React.FC = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // Initialize display and view modes from local storage or default values
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const savedDisplayMode = localStorage.getItem("teamsDisplayMode");
    return (savedDisplayMode as DisplayMode) || "all";
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const savedViewMode = localStorage.getItem("teamsViewMode");
    return (savedViewMode as ViewMode) || (isMobile ? "grid" : "list");
  });

  // Save to local storage when preferences change
  useEffect(() => {
    localStorage.setItem("teamsDisplayMode", displayMode);
  }, [displayMode]);

  useEffect(() => {
    localStorage.setItem("teamsViewMode", viewMode);
  }, [viewMode]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['teams'] });
  }, [queryClient]);

  const content = (
    <div className={cn("space-y-6", animations.fadeIn)}>
      <TeamsHeader 
        title="Teams" 
        description="Browse all teams or view by division"
      >
        <div className="flex flex-wrap gap-3 mt-2 sm:mt-0">
          <TeamsViewToggle
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
          <TeamsDisplayModeToggle
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
          />
        </div>
      </TeamsHeader>
      
      <TeamContainer displayMode={displayMode} viewMode={viewMode} />
    </div>
  );

  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        {content}
      </PullToRefresh>
    );
  }

  return content;
};

export default TeamsPageContainer;
