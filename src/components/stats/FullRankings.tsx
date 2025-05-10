
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
  const isLight = resolvedTheme === "light";
  const isMobile = useIsMobile();

  // Sort rankings by power score for the unified view
  const sortedRankings = view === "all" 
    ? [...rankings].sort((a, b) => b.powerScore - a.powerScore)
    : rankings;

  return (
    <Card>
      <CardHeader className={isMobile ? "pb-2 py-3" : "pb-2"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle
              className={`font-oswald uppercase tracking-wide ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} !font-bold`}
              style={{ letterSpacing: "0.5px" }}
            >
              Complete Team Rankings
            </CardTitle>
            <CardDescription
              className={cn(
                isLight ? "!text-[#444444] !font-medium font-source" : "text-gray-400 font-source",
                isMobile ? "text-xs" : ""
              )}
            >
              Based on opponent-weighted win percentage, strength of schedule (SOS), and game-level performance
            </CardDescription>
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-2" : "p-2 sm:p-4"}>
        <RankingsTable rankings={sortedRankings} showUnified={view === "all"} />
      </CardContent>
    </Card>
  );
};

export default FullRankings;

function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}
