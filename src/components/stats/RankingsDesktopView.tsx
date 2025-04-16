
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

interface RankingsDesktopViewProps {
  rankings: Ranking[];
  expandedTeam: string | null;
  toggleExpand: (teamId: string) => void;
}

const RankingsDesktopView: React.FC<RankingsDesktopViewProps> = ({
  rankings,
  expandedTeam,
  toggleExpand,
}) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="hidden md:table-cell">Division</TableHead>
            <TableHead className="text-center">W-L</TableHead>
            <TableHead className="text-center">Win %</TableHead>
            <TableHead className="text-center">Streak</TableHead>
            <TableHead className="text-center">SOS</TableHead>
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
                  <TableCell colSpan={8} className="bg-gray-50 p-0">
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
