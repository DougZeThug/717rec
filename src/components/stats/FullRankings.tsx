
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RankingsTable from "./RankingsTable";
import { Ranking } from "@/types";
import ViewToggle from "./ViewToggle";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";

interface FullRankingsProps {
  rankings: Ranking[];
}

const FullRankings: React.FC<FullRankingsProps> = ({ rankings }) => {
  const [view, setView] = useState<"division" | "all">("division");
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const isLight = resolvedTheme === "light";

  // Sort rankings by power score for the unified view
  const sortedRankings = view === "all" 
    ? [...rankings].sort((a, b) => b.powerScore - a.powerScore)
    : rankings;

  const headerClasses = isMobile ? "pb-1 pt-2 px-3" : "pb-2";
  const titleClasses = isMobile
    ? "font-oswald uppercase tracking-wide text-lg !font-bold"
    : "font-oswald uppercase tracking-wide text-xl sm:text-2xl !font-bold";

  const flexClasses = isMobile ? "flex flex-col gap-2" : "flex flex-col sm:flex-row sm:items-center justify-between gap-3";
  const contentClasses = isMobile ? "p-1 sm:p-4" : "p-2 sm:p-4";

  return (
    <Card>
      <CardHeader className={headerClasses}>
        <div className={flexClasses}>
          <div>
            <CardTitle
              className={titleClasses}
              style={{ letterSpacing: "0.5px" }}
            >
              Complete Team Rankings
            </CardTitle>
            <CardDescription
              className={isLight ? "!text-[#444444] !font-medium font-source text-xs" : "text-gray-400 font-source text-xs"}
            >
              Based on opponent-weighted win percentage, strength of schedule (SOS), and game-level performance
            </CardDescription>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </CardHeader>
      <CardContent className={contentClasses}>
        <RankingsTable rankings={sortedRankings} showUnified={view === "all"} />
      </CardContent>
    </Card>
  );
};

export default FullRankings;
