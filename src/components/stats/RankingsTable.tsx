
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

interface RankingsTableProps {
  rankings: Ranking[];
}

const RankingsTable: React.FC<RankingsTableProps> = ({ rankings }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">W-L</TableHead>
            <TableHead className="text-center">Win %</TableHead>
            <TableHead className="text-center">SOS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankings.map((ranking, index) => (
            <TableRow key={ranking.teamId}>
              <TableCell className="font-medium">{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                    {ranking.logoUrl ? (
                      <img 
                        src={ranking.logoUrl} 
                        alt={ranking.teamName} 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">No Logo</div>
                    )}
                  </div>
                  <span>{ranking.teamName}</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {ranking.wins}-{ranking.losses}
              </TableCell>
              <TableCell className="text-center">
                {(ranking.winPercentage * 100).toFixed(1)}%
              </TableCell>
              <TableCell className="text-center">
                {(ranking.sos || 0).toFixed(3)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RankingsTable;
