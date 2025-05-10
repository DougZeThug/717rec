import React, { useMemo } from "react";
import { Ranking } from "@/types";
import { SortOptions } from "../RankingsTable";
import { Table, TableHeader, TableRow, TableHead, TableBody } from "@/components/ui/table";
import RankingTableRow from "../RankingTableRow";
import { ChevronDown, ChevronUp } from "lucide-react";

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

  // Add logging to debug rankings in desktop view
  React.useEffect(() => {
    console.log(`Desktop ${divisionName} rankings:`, 
      rankings.map(r => ({
        team: r.teamName,
        rankChange: r.rankChange,
        previousRank: r.previousRank
      }))
    );
  }, [divisionName, rankings]);

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-bold font-bebas tracking-widest text-gray-900 dark:text-white">
        {divisionName}
      </h2>
      <div className="overflow-auto rounded-lg border dark:border-gray-700 dark:bg-gray-800/50 shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
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
          <TableBody>
            {rankedDivisionTeams.map((ranking) => {
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
