
import React from "react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRow, TableCell } from "@/components/ui/table";
import { MatchWithTeams } from "./types";

interface MatchRowProps {
  match: MatchWithTeams;
  index: number;
  onScoreChange: (index: number, team: 'team1' | 'team2', value: string) => void;
  onMarkCompleted: (index: number, checked: boolean) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({ 
  match, 
  index, 
  onScoreChange, 
  onMarkCompleted 
}) => {
  return (
    <TableRow 
      key={match.id} 
      className={
        match.isEdited && !match.isValid ? "bg-red-50" :
        match.isEdited ? "bg-blue-50" : ""
      }
    >
      <TableCell className="font-medium">
        {match.date && format(new Date(match.date), "MMM d, yyyy h:mm a")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {match.team1?.logoUrl && (
            <img 
              src={match.team1.logoUrl} 
              alt={match.team1.name} 
              className="h-6 w-6 object-contain"
            />
          )}
          <span className="font-medium">{match.team1?.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Input
          type="number"
          value={match.team1Score ?? ""}
          onChange={(e) => onScoreChange(index, 'team1', e.target.value)}
          className="max-w-[80px] mx-auto text-center"
          min={0}
        />
      </TableCell>
      <TableCell className="text-center">
        <Input
          type="number"
          value={match.team2Score ?? ""}
          onChange={(e) => onScoreChange(index, 'team2', e.target.value)}
          className="max-w-[80px] mx-auto text-center"
          min={0}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {match.team2?.logoUrl && (
            <img 
              src={match.team2.logoUrl} 
              alt={match.team2.name} 
              className="h-6 w-6 object-contain"
            />
          )}
          <span className="font-medium">{match.team2?.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <div className="flex justify-center">
          <Checkbox
            checked={match.iscompleted || false}
            onCheckedChange={(checked) => 
              onMarkCompleted(index, checked as boolean)
            }
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

export default MatchRow;
