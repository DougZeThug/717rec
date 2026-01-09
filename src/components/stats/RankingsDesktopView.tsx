
import React, { useMemo } from "react";
import { Ranking } from "@/types";
import { SortOptions } from "./RankingsTable";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import DivisionRankingsSection from "./desktop/DivisionRankingsSection";

// Split table display by division or unified table
interface RankingsDesktopViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
}

const RankingsDesktopView: React.FC<RankingsDesktopViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // PERFORMANCE: Memoize division grouping to prevent reduce re-execution on every render
  const rankingsByDivision = useMemo(() => {
    return showUnified
      ? { "All Teams": rankings }
      : rankings.reduce((acc, ranking) => {
          // Use divisionName which now contains the display_division value
          const displayDivision = ranking.divisionName || "Unassigned";
          if (!acc[displayDivision]) acc[displayDivision] = [];
          acc[displayDivision].push(ranking);
          return acc;
        }, {} as Record<string, Ranking[]>);
  }, [rankings, showUnified]);
      
  return (
    <div className="font-inter">
      {Object.entries(rankingsByDivision).map(([displayDivision, divisionRankings]) => (
        <DivisionRankingsSection
          key={displayDivision}
          divisionName={displayDivision}
          rankings={divisionRankings}
          allRankings={rankings}
          expandedTeam={expandedTeam}
          toggleExpand={toggleExpand}
          sortOptions={sortOptions}
          onSortChange={onSortChange}
          showUnified={showUnified}
          isLight={isLight}
        />
      ))}
    </div>
  );
};

export default RankingsDesktopView;
