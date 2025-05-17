import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ranking, HeadToHeadMap, HeadToHeadEntry } from "@/types";
import { cn } from "@/lib/utils";
import RankingTableRow from "../RankingTableRow";
import HeadToHeadRecords from "../HeadToHeadRecords";
import { useTheme } from "next-themes";
import { gradients } from "@/styles/design-system";

interface DivisionRankingsTableProps {
  rankings: Ranking[];
  headToHeadMap?: HeadToHeadMap;
  showDivision?: boolean;
  title?: string;
  divisionId?: string;
}

// Fix the teamHeadToHeadMap type
const transformHeadToHeadForTeam = (
  standings: Ranking[],
  teamId: string,
  headToHeadMap: HeadToHeadMap
): HeadToHeadEntry[] => {
  // If we have specific data for this team, use it
  if (headToHeadMap && headToHeadMap[teamId]) {
    return headToHeadMap[teamId];
  }
  
  // Otherwise, generate empty head-to-head records
  return standings
    .filter(team => team.teamId !== teamId)
    .map(opponent => ({
      opponentId: opponent.teamId,
      opponentName: opponent.teamName,
      wins: 0,
      losses: 0,
    }));
};

const DivisionRankingsTable: React.FC<DivisionRankingsTableProps> = ({
  rankings,
  headToHeadMap = {},
  showDivision = false,
  title,
  divisionId,
}) => {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [currentTeamHeadToHead, setCurrentTeamHeadToHead] = useState<HeadToHeadEntry[]>([]);
  const [filteredRankings, setFilteredRankings] = useState<Ranking[]>([]);
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    // Filter rankings by division if divisionId is provided
    if (divisionId) {
      setFilteredRankings(rankings.filter(team => team.divisionId === divisionId));
    } else {
      setFilteredRankings(rankings);
    }
  }, [rankings, divisionId]);

  const expandRow = (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      return;
    }
    
    setExpandedTeamId(teamId);
    
    // Find the team to get its head to head data
    const team = filteredRankings.find(team => team.teamId === teamId);
    if (!team) return;
    
    // Transform the head to head data properly
    const headToHeadData = transformHeadToHeadForTeam(
      filteredRankings,
      teamId,
      headToHeadMap
    );
    
    setCurrentTeamHeadToHead(headToHeadData);
  };

  return (
    <div className="overflow-x-auto">
      <Table className={cn(
        "bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm",
        "border-t-2 border-t-blue-300 dark:border-t-blue-700/70"
      )}>
        <TableHeader>
          <TableRow className={cn(
            isLight ? "bg-gradient-to-r from-blue-50/80 to-blue-100/50" : "bg-gradient-to-r from-gray-800/90 to-gray-800/60",
            "border-b border-blue-200/70 dark:border-blue-900/30"
          )}>
            <TableHead
              className="w-10 font-mono tracking-wide text-gray-700 dark:text-gray-200"
            >
              Rank
            </TableHead>
            <TableHead
              className="font-semibold uppercase tracking-wide font-oswald text-gray-700 dark:text-gray-200"
            >
              Team
            </TableHead>
            {showDivision && (
              <TableHead className="font-semibold uppercase tracking-wide font-oswald text-gray-700 dark:text-gray-200">
                Division
              </TableHead>
            )}
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Power
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Record
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Win %
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200 hidden md:table-cell"
            >
              Games
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200 hidden lg:table-cell"
            >
              Game %
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              SOS
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Streak
            </TableHead>
            <TableHead
              className="text-center font-mono text-gray-700 dark:text-gray-200"
            >
              Trend
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRankings.map((team, index) => (
            <React.Fragment key={team.teamId}>
              <RankingTableRow
                ranking={team}
                index={index}
                rowIndex={index}
                isExpanded={expandedTeamId === team.teamId}
                onToggleExpand={() => expandRow(team.teamId)}
                showDivision={showDivision}
              />
              {expandedTeamId === team.teamId && (
                <TableRow>
                  <TableCell colSpan={showDivision ? 11 : 10} className="bg-gray-50 dark:bg-gray-800/50 p-0">
                    <div className="p-2">
                      <HeadToHeadRecords headToHead={{ [team.teamId]: currentTeamHeadToHead }} />
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DivisionRankingsTable;
