
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
import { debugLog } from "@/utils/logger";
import { motion, AnimatePresence } from "framer-motion";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

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
  const { isWinterTheme } = useSeasonalTheme();
  const [detailedView, setDetailedView] = useState(() => {
    const savedView = localStorage.getItem("rankingsDetailedView");
    return savedView ? savedView === "true" : false;
  });

  // Enhanced logging to debug ranking data
  useEffect(() => {
    debugLog("Mobile rankings data with trends:", 
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
      debugLog("Teams with non-zero rank changes:", 
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

  // Group by display divisions using divisionName which now contains display_division
  const rankingsByDivision = showUnified
    ? { "All Teams": rankings }
    : rankings.reduce((acc, ranking) => {
        // Use divisionName which now contains the display_division value
        const displayDivision = ranking.divisionName || "Unassigned";
        if (!acc[displayDivision]) {
          acc[displayDivision] = [];
        }
        acc[displayDivision].push(ranking);
        return acc;
      }, {} as Record<string, Ranking[]>);

  return (
    <div className="font-inter">
      <div className="mb-2 space-y-1">
        <div className="flex flex-col gap-1">
          <div className="overflow-x-auto pb-1 touch-pan-x">
            <div className="flex space-x-1">
              {sortableFields.map((field) => (
                <Button
                  key={field.id}
                  variant={sortOptions.field === field.id ? "blueOrange" : "outline"}
                  size="sm"
                  onClick={() => onSortChange(field.id)}
                  className={cn(
                    "rounded-lg py-1 px-2 text-xs font-medium transition-all whitespace-nowrap",
                    isWinterTheme && (sortOptions.field === field.id ? "btn-winter-primary" : "btn-winter-secondary"),
                    !isWinterTheme && sortOptions.field !== field.id && "bg-card hover:bg-accent/50 text-foreground border-border"
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
              onCheckedChange={toggleViewMode}
            />
            <Label
              htmlFor="detailed-view"
              className={cn(
                "text-sm",
                isWinterTheme ? "text-[hsl(var(--muted-foreground))]" : "text-muted-foreground"
              )}
              onClick={() => toggleViewMode(!detailedView)}
            >
              {detailedView ? "Detailed View" : "Compact View"}
            </Label>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(rankingsByDivision).map(([displayDivision, divisionRankings]) => (
          <div key={displayDivision} className="space-y-1">
            {!showUnified && (
              <h3 className={cn(
                "text-lg font-medium flex items-center font-inter",
                isWinterTheme
                  ? "text-[hsl(var(--foreground))] border-l-4 border-[hsl(var(--frost-border))] pl-2 bg-white/5"
                  : "text-foreground border-l-4 border-blue-500 dark:border-blue-700 pl-2 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent"
              )}>
                {displayDivision}{" "}
                <span className="ml-2 text-xs text-muted-foreground font-inter">
                  ({divisionRankings.length})
                </span>
              </h3>
            )}
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {divisionRankings.map((ranking, idx) => {
                  const globalIndex = rankings.findIndex(r => r.teamId === ranking.teamId);
                  return (
                    <motion.div
                      key={ranking.teamId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: idx * 0.03,
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                      }}
                      layout
                    >
                      <RankingCard
                        ranking={ranking}
                        index={globalIndex}
                        expandedTeam={expandedTeam}
                        onToggleExpand={toggleExpand}
                        compactView={!detailedView}
                        showDivision={showUnified}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RankingsMobileView;
