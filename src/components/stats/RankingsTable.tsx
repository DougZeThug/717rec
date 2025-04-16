
import React, { useState, useEffect } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import RankingsMobileView from "./RankingsMobileView";
import RankingsDesktopView from "./RankingsDesktopView";
import { sortRankings } from "@/utils/rankingUtils";

interface RankingsTableProps {
  rankings: Ranking[];
}

export type SortDirection = 'asc' | 'desc';
export interface SortOptions {
  field: string;
  direction: SortDirection;
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortOptions, setSortOptions] = useState<SortOptions>(() => {
    // Try to restore last sort preference from localStorage
    const savedSort = localStorage.getItem("rankingsSortOptions");
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort);
        // Ensure the direction is of valid SortDirection type
        if (parsed.direction !== 'asc' && parsed.direction !== 'desc') {
          parsed.direction = 'desc'; // Default to desc if invalid
        }
        return parsed as SortOptions;
      } catch (e) {
        console.error("Failed to parse saved sort options");
      }
    }
    return { field: 'powerScore', direction: 'desc' };
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Apply sorting to rankings
  const sortedRankings = sortRankings(rankings, sortOptions.field, sortOptions.direction);

  // Handle column header click for sorting
  const handleSortChange = (field: string) => {
    const newDirection: SortDirection = sortOptions.field === field && sortOptions.direction === 'desc' ? 'asc' : 'desc';
    const newSortOptions: SortOptions = {
      field,
      direction: newDirection
    };
    setSortOptions(newSortOptions);
    
    // Save to localStorage
    localStorage.setItem("rankingsSortOptions", JSON.stringify(newSortOptions));
  };

  if (isMobile) {
    // Mobile card layout
    return (
      <RankingsMobileView
        rankings={sortedRankings}
        expandedTeam={expandedTeam}
        toggleExpand={toggleExpand}
        sortOptions={sortOptions}
        onSortChange={handleSortChange}
      />
    );
  }

  // Desktop table layout
  return (
    <RankingsDesktopView
      rankings={sortedRankings}
      expandedTeam={expandedTeam}
      toggleExpand={toggleExpand}
      sortOptions={sortOptions}
      onSortChange={handleSortChange}
    />
  );
};

export default RankingsTable;
