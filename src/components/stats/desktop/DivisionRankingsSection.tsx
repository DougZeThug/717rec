
import React, { useMemo } from "react";
import { Ranking } from "@/types";
import { SortOptions } from "../RankingsTable";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import RankingTableRow from "../RankingTableRow";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

interface DivisionRankingsSectionProps {
  divisionName: string;
  rankings: Ranking[];
  allRankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
  showUnified?: boolean;
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
  showUnified = false,
  isLight,
}) => {
  const getSortIndicator = (field: string) => {
    if (sortOptions.field !== field) return null;
    return sortOptions.direction === "asc" ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  const rankedDivisionTeams = useMemo(() => {
    return rankings.map((team, index) => ({
      ...team,
      divisionRank: !showUnified ? index + 1 : undefined,
    }));
  }, [rankings, showUnified]);

  // Add debug logging for each team's rank change
  React.useEffect(() => {
    // Log all teams' rank changes to help debugging
    console.log(`Desktop ${divisionName} rankings trends:`, 
      rankings.map(r => ({
        team: r.teamName,
        rankChange: r.rankChange !== undefined ? r.rankChange : 'undefined',
        previousRank: r.previousRank !== undefined ? r.previousRank : 'undefined'
      }))
    );
  }, [divisionName, rankings]);

  // Get division-specific gradient
  const getDivisionGradient = () => {
    const divName = divisionName.toLowerCase();
    if (divName.includes('competitive')) {
      return isLight ? 
        "bg-gradient-to-r from-amber-50/50 to-transparent" : 
        "bg-gradient-to-r from-amber-900/10 to-transparent";
    }
    if (divName.includes('intermediate')) {
      return isLight ? 
        "bg-gradient-to-r from-blue-50/50 to-transparent" : 
        "bg-gradient-to-r from-blue-900/10 to-transparent";
    }
    if (divName.includes('recreational')) {
      return isLight ? 
        "bg-gradient-to-r from-green-50/50 to-transparent" : 
        "bg-gradient-to-r from-green-900/10 to-transparent";
    }
    return isLight ?
      "bg-gradient-to-r from-gray-50/70 to-transparent" :
      "bg-gradient-to-r from-gray-800/30 to-transparent";
  };

  return (
    <div className="mb-6 sm:mb-8">
      <h2 className={cn(
        "mb-3 sm:mb-4 text-xl font-bold font-bebas tracking-widest",
        "border-l-4 border-blue-500 dark:border-blue-700/80 pl-3 py-1",
        getDivisionGradient(),
        isLight ? "text-gray-900" : "text-white"
      )}>
        {divisionName}
      </h2>
      <div className="overflow-auto rounded-lg border border-blue-200/50 dark:border-blue-800/30 dark:bg-gray-800/50 shadow-sm">
        <Table>
          <TableHeader className={cn(
            isLight ? "bg-gradient-to-r from-blue-50/80 to-blue-100/30" : "bg-gradient-to-r from-blue-900/10 to-gray-800/60",
            "border-b border-blue-200/50 dark:border-blue-900/30"
          )}>
            <TableRow>
              <TableHead 
                className="text-gray-700 dark:text-gray-200 w-12 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer font-medium" 
                onClick={() => onSortChange("rank")}
              >
                # {getSortIndicator("rank")}
              </TableHead>
              <TableHead 
                className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer font-medium" 
                onClick={() => onSortChange("teamName")}
              >
                Team {getSortIndicator("teamName")}
              </TableHead>
              {showUnified && (
                <TableHead className="text-gray-700 dark:text-gray-200 font-medium">Division</TableHead>
              )}
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("powerScore")}
              >
                Power {getSortIndicator("powerScore")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("wins")}
              >
                W-L {getSortIndicator("wins")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("winPercentage")}
              >
                Win % {getSortIndicator("winPercentage")}
              </TableHead>
              <TableHead 
                className="text-center hidden md:table-cell cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("gamesWon")}
              >
                Games {getSortIndicator("gamesWon")}
              </TableHead>
              <TableHead 
                className="text-center hidden lg:table-cell cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("gameWinPercentage")}
              >
                Game % {getSortIndicator("gameWinPercentage")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("sos")}
              >
                SOS {getSortIndicator("sos")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white text-gray-700 dark:text-gray-200 font-medium" 
                onClick={() => onSortChange("streak")}
              >
                Streak {getSortIndicator("streak")}
              </TableHead>
              <TableHead className="text-center text-gray-700 dark:text-gray-200 font-medium">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={isLight ? "bg-gradient-to-br from-white to-gray-50/50" : ""}>
            {rankedDivisionTeams.map((ranking, index) => {
              // Always use the global ranking index from allRankings, regardless of view mode
              const globalIndex = allRankings.findIndex(r => r.teamId === ranking.teamId);
              
              return (
                <RankingTableRow
                  key={ranking.teamId}
                  ranking={ranking}
                  index={globalIndex}
                  isExpanded={expandedTeam === ranking.teamId}
                  onToggleExpand={() => toggleExpand(ranking.teamId)}
                  showDivision={showUnified}
                  rowIndex={index}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DivisionRankingsSection;
