
import React from "react";
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
  // Split into divisions or display unified
  const rankingsByDivision = showUnified 
    ? { "All Teams": rankings }
    : rankings.reduce((acc, ranking) => {
        const divisionName = ranking.divisionName || "Unassigned";
        if (!acc[divisionName]) acc[divisionName] = [];
        acc[divisionName].push(ranking);
        return acc;
      }, {} as Record<string, Ranking[]>);
  return (
    <div className="font-inter">
      {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
        <DivisionRankingsSection
          key={divisionName}
          divisionName={divisionName}
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

