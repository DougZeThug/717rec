
import React, { useState, useEffect } from "react";
import { Ranking } from "@/types";
import RankingCard from "./RankingCard";
import { SortOptions } from "./RankingsTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Bolt, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface RankingsMobileViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
}

const RankingsMobileView: React.FC<RankingsMobileViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
  showUnified = false
}) => {
  const [detailedView, setDetailedView] = useState(() => {
    const savedView = localStorage.getItem("rankingsDetailedView");
    return savedView ? savedView === "true" : false;
  });

  // Enhanced logging to debug ranking data
  useEffect(() => {
    console.log("Mobile rankings data with trends:", 
      rankings.map(r => ({
        team: r.teamName,
        rank: rankings.findIndex(sr => sr.teamId === r.teamId) + 1,
        rankChange: r.rankChange,
        previousRank: r.previousRank
      }))
    );
    
    // Log any teams with actual rank changes
    const teamsWithChanges = rankings.filter(r => r.rankChange !== 0 && r.rankChange !== undefined);
    if (teamsWithChanges.length > 0) {
      console.log("Teams with non-zero rank changes:", 
        teamsWithChanges.map(r => ({
          team: r.teamName,
          rankChange: r.rankChange
        }))
      );
    }
  }, [rankings]);

  const sortableFields = [
    { id: 'powerScore', label: (<><Bolt size={16} className="inline-block mr-1" />Power</>) },
    { id: 'winPercentage', label: 'Win %' },
    { id: 'sos', label: (<><Scale size={15} className="inline-block mr-1" />SOS</>) },
    { id: 'wins', label: 'Wins' },
  ];

  const toggleViewMode = (checked: boolean) => {
    setDetailedView(checked);
    localStorage.setItem("rankingsDetailedView", String(checked));
  };

  const rankingsByDivision = showUnified
    ? { "All Teams": rankings }
    : rankings.reduce((acc, ranking) => {
        const divisionName = ranking.divisionName || "Unassigned";
        if (!acc[divisionName]) {
          acc[divisionName] = [];
        }
        acc[divisionName].push(ranking);
        return acc;
      }, {} as Record<string, Ranking[]>);

  return (
    <div className="font-inter">
      <div className="mb-2 space-y-1">
        <div className="flex flex-col gap-1">
          <div className="overflow-x-auto pb-1">
            <div className="flex space-x-1">
              {sortableFields.map((field) => (
                <Button
                  key={field.id}
                  variant={sortOptions.field === field.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSortChange(field.id)}
                  className={cn(
                    "rounded-lg py-1 px-2 text-xs font-medium transition-all whitespace-nowrap",
                    sortOptions.field === field.id
                      ? "bg-gradient-to-br from-blue-500 via-blue-600 to-amber-500 text-white hover:from-blue-400 hover:via-blue-500 hover:to-amber-400 dark:from-blue-600 dark:to-amber-600 dark:text-white dark:border dark:border-blue-500/50"
                      : "bg-white hover:bg-gradient-to-br hover:from-blue-50/40 hover:to-orange-50/20 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:border-gray-700"
                  )}
                >
                  {field.label}
                  {sortOptions.field === field.id && (
                    sortOptions.direction === 'asc' 
                      ? <ArrowUp className="ml-1 h-3 w-3" /> 
                      : <ArrowDown className="ml-1 h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="detailed-view"
              checked={detailedView}
            />
            <Label
              htmlFor="detailed-view"
              className="text-sm text-gray-700 dark:text-gray-300"
              onClick={() => toggleViewMode(!detailedView)}
            >
              {detailedView ? "Detailed View" : "Compact View"}
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
          <div key={divisionName} className="space-y-1">
            {!showUnified && (
              <h3 className={cn(
                "text-lg font-medium flex items-center font-inter text-gray-900 dark:text-white",
                "border-l-4 border-blue-500 dark:border-blue-700 pl-2",
                "bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent"
              )}>
                {divisionName}{" "}
                <span className="ml-2 text-xs text-gray-600 dark:text-gray-400 font-inter">
                  ({divisionRankings.length})
                </span>
              </h3>
            )}
            <div className="space-y-1">
              {divisionRankings.map((ranking) => {
                const globalIndex = rankings.findIndex(r => r.teamId === ranking.teamId);
                return (
                  <RankingCard
                    key={ranking.teamId}
                    ranking={ranking}
                    index={globalIndex}
                    expandedTeam={expandedTeam}
                    onToggleExpand={toggleExpand}
                    compactView={!detailedView}
                    showDivision={showUnified}
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
