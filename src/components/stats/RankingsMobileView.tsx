
import React, { useState } from "react";
import { Ranking } from "@/types";
import RankingCard from "./RankingCard";
import { SortOptions } from "./RankingsTable";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Bolt, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

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

  const { theme } = useTheme();
  const isLight = theme === "light";

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
                  className={cn(
                    "rounded-lg py-2 px-4 font-medium transition-all whitespace-nowrap",
                    isLight
                      ? (sortOptions.field === field.id
                          ? "bg-blue-600 text-white hover:bg-blue-700 border-[#e0e0e0]"
                          : "bg-white !text-gray-800 border border-[#e0e0e0] hover:bg-[#f0f0f0]")
                      : ""
                  )}
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
            <Label htmlFor="detailed-view" className={isLight ? "text-sm !text-gray-800 font-medium" : "text-sm text-gray-200"}>
              {detailedView ? "Detailed View" : "Compact View"}
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        {Object.entries(rankingsByDivision).map(([divisionName, divisionRankings]) => (
          <div key={divisionName} className="space-y-4">
            {!showUnified && (
              <h3 className={isLight
                ? "text-lg font-medium flex items-center font-inter !text-[#111111]"
                : "text-lg font-medium flex items-center font-inter text-gray-100"
                }>
                {divisionName} <span className={isLight ? "ml-2 text-xs !text-[#222222] font-inter" : "ml-2 text-xs text-gray-400 font-inter"}>({divisionRankings.length})</span>
              </h3>
            )}
            <div className="space-y-4">
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
