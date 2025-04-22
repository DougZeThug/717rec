
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
      {/* Condensed Header Section */}
      <div className="mt-2 mb-2 space-y-2">
        <h1 className="font-oswald text-3xl font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
          Teams
        </h1>
        {/* Compact controls layout */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Display Mode Toggle with compact View label */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View:</span>
            <TeamsDisplayModeToggle displayMode={displayMode} setDisplayMode={setDisplayMode} />
          </div>
          {/* View Mode (list/grid), sort toggle, refresh */}
          <div className="flex gap-2 items-center">
            <TeamsHeader
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
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

