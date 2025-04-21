
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RankingsTable from "./RankingsTable";
import { Ranking } from "@/types";
import ViewToggle from "./ViewToggle";
import { useTheme } from "next-themes";

interface FullRankingsProps {
  rankings: Ranking[];
}

const FullRankings: React.FC<FullRankingsProps> = ({ rankings }) => {
  const [view, setView] = useState<"division" | "all">("division");
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Sort rankings by power score for the unified view
  const sortedRankings = view === "all" 
    ? [...rankings].sort((a, b) => b.powerScore - a.powerScore)
    : rankings;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Complete Team Rankings</CardTitle>
            <CardDescription
              className={isLight ? "text-gray-700" : "text-gray-400"} // Darkened subtitle text in light mode
            >
              Based on opponent-weighted win percentage, strength of schedule (SOS), and game-level performance
            </CardDescription>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </CardHeader>
      <CardContent>
        <RankingsTable rankings={sortedRankings} showUnified={view === "all"} />
      </CardContent>
    </Card>
  );
};

export default FullRankings;
