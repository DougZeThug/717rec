
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import RankingsTable from "./RankingsTable";
import { Ranking } from "@/types";
import ViewToggle from "./ViewToggle";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

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
    <Card className={cn(
      "border-t-2 border-blue-300 dark:border-blue-700/80",
      "shadow-lg hover:shadow-xl transition-shadow duration-300",
      isLight ? gradients.card.blueOrange : ""
    )}>
      <CardHeader className={cn(
        isMobile ? "pb-1 pt-3" : "pb-2",
        isLight ? "bg-gradient-to-br from-white via-blue-50/20 to-orange-50/30" : "bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/80",
        "border-b border-blue-100 dark:border-blue-900/30 rounded-t-lg"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div>
            <CardTitle
              className={cn(
                `font-oswald uppercase tracking-wide ${isMobile ? 'text-lg' : 'text-xl sm:text-2xl'} !font-bold`,
                "bg-gradient-to-br from-blue-800 via-blue-700 to-amber-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-amber-400"
              )}
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
      <CardContent className={cn(
        isMobile ? "p-1 pt-0.5" : "p-2 sm:p-4",
        "bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800/90 dark:to-gray-900"
      )}>
        <RankingsTable rankings={sortedRankings} showUnified={view === "all"} />
      </CardContent>
    </Card>
  );
};

export default FullRankings;
