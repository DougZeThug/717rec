
import React from "react";
import DivisionRankingsTable from "./DivisionRankingsTable";
import { Ranking } from "@/types";
import { SortOptions } from "../RankingsTable";

interface DivisionRankingsSectionProps {
  divisionName: string;
  rankings: Ranking[];
  allRankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified: boolean;
  isLight: boolean;
}

const DivisionRankingsSection: React.FC<DivisionRankingsSectionProps> = ({
  divisionName,
  rankings,
  allRankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified,
  isLight,
}) => (
  <div className="mb-8">
    {!showUnified && (
      <h3 className="text-lg font-semibold mb-3 flex items-center font-inter text-gray-800 dark:text-white">
        <span>{divisionName}</span>
        <span className="ml-1 text-gray-600 dark:text-gray-300">
          ({rankings.length})
        </span>
      </h3>
    )}
    <DivisionRankingsTable
      rankings={rankings}
      allRankings={allRankings}
      expandedTeam={expandedTeam}
      toggleExpand={toggleExpand}
      sortOptions={sortOptions}
      onSortChange={onSortChange}
      showUnified={showUnified}
      isLight={isLight}
    />
  </div>
);

export default DivisionRankingsSection;
