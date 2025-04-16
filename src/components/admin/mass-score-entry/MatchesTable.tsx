
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { MatchWithTeams } from "./types";
import MatchRow from "./MatchRow";

interface MatchesTableProps {
  matches: MatchWithTeams[];
  loading: boolean;
  onScoreChange: (index: number, team: 'team1' | 'team2', value: string) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
}

const MatchesTable: React.FC<MatchesTableProps> = ({ 
  matches,
  loading,
  onScoreChange,
  onMarkCompleted
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No matches found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Date</TableHead>
            <TableHead>Team 1</TableHead>
            <TableHead className="text-center w-[100px]">Score</TableHead>
            <TableHead className="text-center w-[100px]">Score</TableHead>
            <TableHead>Team 2</TableHead>
            <TableHead className="text-center w-[120px]">Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match, index) => (
            <MatchRow
              key={match.id}
              match={match}
              index={index}
              onScoreChange={onScoreChange}
              onMarkCompleted={onMarkCompleted}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default MatchesTable;
