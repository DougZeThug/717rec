
import React, { useState } from "react";
import TeamsContainer from "@/components/teams/TeamsContainer";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";
import PageHeader from "@/components/layout/PageHeader";
import { TeamsHeader } from "./TeamsHeader";

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
    <div className="space-y-4">
      <PageHeader title="Teams">
        {/* Compact controls layout */}
        <div className="flex flex-wrap items-center gap-2 justify-between mt-3">
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
        <div className="border-b border-muted mt-2" />
      </PageHeader>
      
      {/* Teams Content */}
      <TeamsContainer displayMode={displayMode} viewMode={viewMode} />
    </div>
  );
};

export default TeamsPageContainer;
