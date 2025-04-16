
import React, { useState } from "react";
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
  const [sortOptions, setSortOptions] = useState<SortOptions>({ 
    field: 'powerScore', 
    direction: 'desc' 
  });

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  // Apply sorting to rankings
  const sortedRankings = sortRankings(rankings, sortOptions.field, sortOptions.direction);

  // Handle column header click for sorting
  const handleSortChange = (field: string) => {
    setSortOptions(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
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
