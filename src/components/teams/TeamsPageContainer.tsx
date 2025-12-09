
import React, { useState, useEffect } from "react";
import TeamContainer from "./TeamsContainer";
import TeamsHeader from "./TeamsHeader";
import { animations } from "@/styles/design-system";
import { cn } from "@/lib/utils";
import TeamsViewToggle from "./TeamsViewToggle";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";
import { useIsMobile } from "@/hooks/use-mobile";

export type DisplayMode = 'all' | 'grouped';
export type ViewMode = 'grid' | 'list';

const TeamsPageContainer: React.FC = () => {
  const isMobile = useIsMobile();

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

  return (
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
};

export default TeamsPageContainer;
