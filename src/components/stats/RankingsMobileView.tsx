
import React, { useState, useEffect } from "react";
import { Ranking } from "@/types";
import RankingCard from "./RankingCard";
import { SortOptions } from "./RankingsTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  // Initialize detailed view state from localStorage or default to false
  const [detailedView, setDetailedView] = useState(() => {
    const savedView = localStorage.getItem("rankingsDetailedView");
    return savedView ? savedView === "true" : false;
  });

  // Define sortable fields for mobile view
  const sortableFields = [
    { id: 'powerScore', label: 'Power Score' },
    { id: 'winPercentage', label: 'Win %' },
    { id: 'sos', label: 'SOS' },
    { id: 'wins', label: 'Wins' },
  ];

  // Update localStorage when view preference changes
  const toggleViewMode = (checked: boolean) => {
    setDetailedView(checked);
    localStorage.setItem("rankingsDetailedView", String(checked));
  };

  // Group rankings by division
  const rankingsByDivision: Record<string, Ranking[]> = {};
  rankings.forEach(ranking => {
    const divisionName = ranking.divisionName || "Unassigned";
    if (!rankingsByDivision[divisionName]) {
      rankingsByDivision[divisionName] = [];
    }
    rankingsByDivision[divisionName].push(ranking);
  });

  return (
    <div>
      <div className="mb-4 space-y-4">
        <div className="flex flex-col gap-4">
          <div className="overflow-x-auto pb-2">
            <div className="flex space-x-2">
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
          
          <div className="flex items-center space-x-2">
            <Switch
              id="detailed-view"
              checked={detailedView}
              onCheckedChange={toggleViewMode}
            />
            <Label htmlFor="detailed-view" className="text-sm">
              {detailedView ? "Detailed View" : "Compact View"}
            </Label>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
          <div key={divisionName} className="space-y-4">
            <h3 className="text-lg font-medium flex items-center">
              {divisionName} <span className="text-muted-foreground ml-1">({divisionRankings.length})</span>
            </h3>
            <div className="space-y-4">
              {divisionRankings.map((ranking, index) => {
                // Calculate the global index for the ranking
                const globalIndex = rankings.findIndex(r => r.teamId === ranking.teamId);
                return (
                  <RankingCard
                    key={ranking.teamId}
                    ranking={ranking}
                    index={globalIndex}
                    expandedTeam={expandedTeam}
                    onToggleExpand={toggleExpand}
                    compactView={!detailedView}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingsMobileView;
