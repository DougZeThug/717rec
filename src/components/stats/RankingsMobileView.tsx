
import React from "react";
import { Ranking } from "@/types";
import RankingCard from "./RankingCard";
import { SortOptions } from "./RankingsTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

interface RankingsMobileViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
}

const RankingsMobileView: React.FC<RankingsMobileViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
}) => {
  // Define sortable fields for mobile view
  const sortableFields = [
    { id: 'powerScore', label: 'Power Score' },
    { id: 'winPercentage', label: 'Win %' },
    { id: 'sos', label: 'SOS' },
    { id: 'gameWinPercentage', label: 'Game Win %' },
    { id: 'wins', label: 'Wins' },
  ];

  return (
    <div>
      <div className="mb-4 overflow-x-auto">
        <div className="flex space-x-2 pb-2">
          {sortableFields.map((field) => (
            <Button
              key={field.id}
              variant={sortOptions.field === field.id ? "default" : "outline"}
              size="sm"
              onClick={() => onSortChange(field.id)}
              className="whitespace-nowrap"
            >
              {field.label}
              {sortOptions.field === field.id && (
                sortOptions.direction === 'asc' 
                  ? <ArrowUp className="ml-1 h-4 w-4" /> 
                  : <ArrowDown className="ml-1 h-4 w-4" />
              )}
            </Button>
          ))}
        </div>
      </div>
      
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
    </div>
  );
};

export default RankingsMobileView;
