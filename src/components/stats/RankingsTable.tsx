
import React, { useState } from "react";
import { Ranking } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";
import RankingsMobileView from "./RankingsMobileView";
import RankingsDesktopView from "./RankingsDesktopView";

interface RankingsTableProps {
  rankings: Ranking[];
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings }) => {
  const isMobile = useIsMobile();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const toggleExpand = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId);
  };

  if (isMobile) {
    // Mobile card layout
    return (
      <RankingsMobileView
        rankings={rankings}
        expandedTeam={expandedTeam}
        toggleExpand={toggleExpand}
      />
    );
  }

  // Desktop table layout
  return (
    <RankingsDesktopView
      rankings={rankings}
      expandedTeam={expandedTeam}
      toggleExpand={toggleExpand}
    />
  );
};

export default RankingsTable;
