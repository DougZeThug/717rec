
import React, { useState } from "react";
import { TeamsHeader } from "@/components/teams/TeamsHeader";
import TeamsContainer from "@/components/teams/TeamsContainer";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";

export type DisplayMode = "all" | "grouped";

const TeamsPageContainer: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div>
      {/* Header Section */}
      <div className="mt-2 pt-1 space-y-2 sm:space-y-4">
        {/* Page Title */}
        <h1 className="font-oswald text-3xl font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
          Teams
        </h1>

        {/* Toggles & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
          {/* Display Mode & Hint */}
          <div className="flex flex-col min-w-[180px]">
            <div className="flex items-center">
              <span className="text-sm font-medium text-muted-foreground mr-2">Display Mode:</span>
              <TeamsDisplayModeToggle displayMode={displayMode} setDisplayMode={setDisplayMode} />
            </div>
            <div className="mt-1 ml-0.5 text-xs text-muted-foreground">
              Switch between grouped and ungrouped team views.
            </div>
          </div>

          {/* View Mode Toggle + Sort Toggle + Refresh */}
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 items-start sm:items-center">
            {/* Grid/List toggle, smaller */}
            <div className="flex items-center mr-1">
              <TeamsHeader
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                // Reduce button size via passed viewMode & styling
              />
            </div>
          </div>
        </div>
        {/* Divider */}
        <div className="border-b border-muted mb-2" />
      </div>
      {/* Teams Content */}
      <TeamsContainer displayMode={displayMode} viewMode={viewMode} />
    </div>
  );
};

export default TeamsPageContainer;

