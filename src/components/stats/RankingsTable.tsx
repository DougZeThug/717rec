import React, { useState, useEffect } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import RankingsMobileView from "./RankingsMobileView";
import RankingsDesktopView from "./RankingsDesktopView";
import { sortRankings } from "@/utils/rankingUtils";

interface RankingsTableProps {
  rankings: Ranking[];
  showUnified?: boolean;
}

export type SortDirection = 'asc' | 'desc';
export interface SortOptions {
  field: string;
  direction: SortDirection;
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings, showUnified = false }) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortOptions, setSortOptions] = useState<SortOptions>(() => {
    const savedSort = localStorage.getItem("rankingsSortOptions");
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort);
        const direction: SortDirection = parsed.direction === 'asc' ? 'asc' : 'desc';
        return { 
          field: parsed.field || 'powerScore', 
          direction 
        };
      } catch (e) {
        console.error("Failed to parse saved sort options");
      }
    }
    return { field: 'powerScore', direction: 'desc' };
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  const sortedRankings = sortRankings(rankings, sortOptions.field, sortOptions.direction);

  const handleSortChange = (field: string) => {
    const newDirection: SortDirection = sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    const newSortOptions: SortOptions = {
      field,
      direction: newDirection
    };
    setSortOptions(newSortOptions);
    
    localStorage.setItem("rankingsSortOptions", JSON.stringify(newSortOptions));
  };

  if (isMobile) {
    return (
      <RankingsMobileView
        rankings={sortedRankings}
        expandedTeam={expandedTeam}
        toggleExpand={toggleExpand}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
        showUnified={showUnified}
      />
    );
  }

  return (
    <RankingsDesktopView
      rankings={sortedRankings}
      expandedTeam={expandedTeam}
      toggleExpand={toggleExpand}
      sortOptions={sortOptions}
      onSortChange={handleSortChange}
      showUnified={showUnified}
    />
  );
};

export default RankingsTable;
