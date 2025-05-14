
import React, { useState } from "react";
import TeamsContainer from "@/components/teams/TeamsContainer";
import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";
import PageHeader from "@/components/layout/PageHeader";
import { TeamsHeader } from "./TeamsHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type DisplayMode = "all" | "grouped";

const TeamsPageContainer: React.FC = () => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Teams">
        {/* Improved layout with better spacing */}
        <div className={cn(
          "mt-5 space-y-4",
          "bg-white/5 dark:bg-gray-800/20 backdrop-blur-sm rounded-lg",
          "p-3 sm:p-4 border border-gray-200 dark:border-gray-700/30 shadow-sm"
        )}>
          {/* Display Mode Toggle in its own row */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground dark:text-gray-300">View:</span>
            <TeamsDisplayModeToggle displayMode={displayMode} setDisplayMode={setDisplayMode} />
          </div>
          
          {/* View Mode (list/grid), sort toggle, refresh in a separate row */}
          <div className="flex justify-between items-center">
            <div className={`${isMobile ? 'w-full' : 'w-auto'}`}>
              {/* This space is available for additional controls if needed */}
            </div>
            <TeamsHeader
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
          
          {/* Divider with improved spacing */}
          <div className="border-b border-gray-200/30 dark:border-gray-700/30 my-1" />
        </div>
      </PageHeader>
      
      {/* Teams Content */}
      <TeamsContainer displayMode={displayMode} viewMode={viewMode} />
    </div>
  );
};

export default TeamsPageContainer;
