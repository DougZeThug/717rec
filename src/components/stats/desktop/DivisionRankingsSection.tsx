
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

  return (
    <div className="mb-8">
      <h2 className="mb-4 text-xl font-bold font-bebas tracking-widest text-gray-900 dark:text-white">
        {divisionName}
      </h2>
      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800/60">
            <TableRow>
              <TableHead 
                className="text-gray-700 dark:text-gray-300 w-12 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer" 
                onClick={() => onSortChange("rank")}
              >
                # {getSortIndicator("rank")}
              </TableHead>
              <TableHead 
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer" 
                onClick={() => onSortChange("teamName")}
              >
                Team {getSortIndicator("teamName")}
              </TableHead>
              {showUnified && (
                <TableHead className="text-gray-700 dark:text-gray-300">Division</TableHead>
              )}
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("powerScore")}
              >
                Power {getSortIndicator("powerScore")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("wins")}
              >
                W-L {getSortIndicator("wins")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("winPercentage")}
              >
                Win % {getSortIndicator("winPercentage")}
              </TableHead>
              <TableHead 
                className="text-center hidden md:table-cell cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("gamesWon")}
              >
                Games {getSortIndicator("gamesWon")}
              </TableHead>
              <TableHead 
                className="text-center hidden lg:table-cell cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("gameWinPercentage")}
              >
                Game % {getSortIndicator("gameWinPercentage")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("sos")}
              >
                SOS {getSortIndicator("sos")}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:text-gray-700 dark:hover:text-white dark:text-gray-300" 
                onClick={() => onSortChange("streak")}
              >
                Streak {getSortIndicator("streak")}
              </TableHead>
              <TableHead className="text-center dark:text-gray-300">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankedDivisionTeams.map((ranking, index) => (
              <RankingTableRow
                key={ranking.teamId}
                ranking={ranking}
                index={showUnified ? allRankings.findIndex(r => r.teamId === ranking.teamId) : index}
                isExpanded={expandedTeam === ranking.teamId}
                onToggleExpand={() => toggleExpand(ranking.teamId)}
                showDivision={showUnified}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DivisionRankingsSection;
