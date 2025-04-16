
import React from "react";
import { Ranking } from "@/types";
import RankingCard from "./RankingCard";

interface RankingsMobileViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
}

const RankingsMobileView: React.FC<RankingsMobileViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
}) => {
  return (
    <div className="space-y-4">
      {rankings.map((ranking, index) => (
        <RankingCard
          key={ranking.teamId}
          ranking={ranking}
          index={index}
          expandedTeam={expandedTeam}
          onToggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
};

export default RankingsMobileView;
