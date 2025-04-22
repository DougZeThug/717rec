
import React, { useState } from "react";
import { TeamsHeader } from "@/components/teams/TeamsHeader"; // Changed to named import
import TeamsContainer from "@/components/teams/TeamsContainer";

export type DisplayMode = "all" | "grouped";

const TeamsPageContainer: React.FC = () => {
  // Default to "All Teams" view
  const [displayMode, setDisplayMode] = useState<DisplayMode>("all");

  return (
    <>
      <TeamsHeader />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 gap-3 mb-3">
        <div className="flex-1">
          <span className="text-sm font-medium text-muted-foreground mr-2">Display Mode:</span>
          <TeamsDisplayModeToggle displayMode={displayMode} setDisplayMode={setDisplayMode} />
          <div className="mt-1 ml-0.5 text-xs text-muted-foreground">
            Switch between grouped and ungrouped team views.
          </div>
        </div>
      </div>
      <TeamsContainer displayMode={displayMode} />
    </>
  );
};

import TeamsDisplayModeToggle from "./TeamsDisplayModeToggle";
export default TeamsPageContainer;
