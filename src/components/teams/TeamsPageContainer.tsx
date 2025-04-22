
import React, { useState } from "react";
import { TeamsHeader } from "@/components/teams/TeamsHeader"; // Changed to named import
import TeamsContainer from "@/components/teams/TeamsContainer";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";

export type DisplayMode = "all" | "grouped";

const TeamsPageContainer: React.FC = () => {
  // Default to "All Teams" view
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Add actual refresh logic here if needed
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div>
      <TeamsHeader 
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-3 mb-3">
        <div className="flex-1">
          <span className="text-sm font-medium text-muted-foreground mr-2">Display Mode:</span>
          <TeamsDisplayModeToggle displayMode={displayMode} setDisplayMode={setDisplayMode} />
          <div className="mt-1 ml-0.5 text-xs text-muted-foreground">
            Switch between grouped and ungrouped team views.
          </div>
        </div>
      </div>
      <TeamsContainer displayMode={displayMode} viewMode={viewMode} />
    </div>
  );
};

export default TeamsPageContainer;
