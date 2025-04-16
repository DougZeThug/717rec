
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ranking } from "@/types";
import RankingTableRow from "./RankingTableRow";
import HeadToHeadRecords from "./HeadToHeadRecords";
import { SortOptions } from "./RankingsTable";
import { ArrowDown, ArrowUp } from "lucide-react";

interface RankingsDesktopViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
  sortOptions: SortOptions;
  onSortChange: (field: string) => void;
}

const RankingsDesktopView: React.FC<RankingsDesktopViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
  sortOptions,
  onSortChange,
}) => {
  // Render sort indicator based on current sort options
  const renderSortIndicator = (field: string) => {
    if (sortOptions.field === field) {
      return sortOptions.direction === 'asc' 
        ? <ArrowUp className="inline-block ml-1 h-4 w-4" /> 
        : <ArrowDown className="inline-block ml-1 h-4 w-4" />;
    }
    return null;
  };

  // Helper for creating sortable column headers
  const SortableHeader = ({ field, children, className }: { field: string, children: React.ReactNode, className?: string }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-gray-50 ${className || ''}`}
      onClick={() => onSortChange(field)}
    >
      <div className="flex items-center justify-center">
        {children}
        {renderSortIndicator(field)}
      </div>
    </TableHead>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="hidden md:table-cell">Division</TableHead>
            <SortableHeader field="wins" className="text-center">W-L</SortableHeader>
            <SortableHeader field="winPercentage" className="text-center">Win %</SortableHeader>
            <SortableHeader field="gamesWon" className="text-center hidden md:table-cell">Games (W-L)</SortableHeader>
            <SortableHeader field="gameWinPercentage" className="text-center hidden lg:table-cell">Game %</SortableHeader>
            <SortableHeader field="sos" className="text-center">SOS</SortableHeader>
            <SortableHeader field="powerScore" className="text-center hidden lg:table-cell">Power Score</SortableHeader>
            <TableHead className="text-center">Streak</TableHead>
            <TableHead className="text-center">Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <React.Fragment key={ranking.teamId}>
              <RankingTableRow
                ranking={ranking}
                index={index}
                isExpanded={expandedTeam === ranking.teamId}
                onToggleExpand={() => toggleExpand(ranking.teamId)}
              />
              {expandedTeam === ranking.teamId && (
                <TableRow>
                  <TableCell colSpan={11} className="bg-gray-50 p-0">
                    <div className="p-4">
                      <HeadToHeadRecords headToHead={ranking.headToHead} />
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

export default RankingsDesktopView;
