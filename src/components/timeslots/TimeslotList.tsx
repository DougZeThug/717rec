
import React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Team, TeamTimeslot } from "@/types";

interface TimeslotListProps {
  timeslots: TeamTimeslot[];
  teams: Team[];
  onDelete: (id: string) => void;
}

const TimeslotList: React.FC<TimeslotListProps> = ({ 
  timeslots, 
  teams,
  onDelete 
}) => {
  // Helper function to get team name by ID
  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return 'Unknown Team';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };
  
  // Sort timeslots by time
  const sortedTimeslots = [...timeslots].sort((a, b) => {
    if (a.timeslot < b.timeslot) return -1;
    if (a.timeslot > b.timeslot) return 1;
    return 0;
  });
  
  if (timeslots.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No timeslots have been assigned for this date.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTimeslots.map((timeslot) => (
            <TableRow key={timeslot.id}>
              <TableCell className="font-medium">{timeslot.timeslot}</TableCell>
              <TableCell>{getTeamName(timeslot.team_id)}</TableCell>
              <TableCell>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onDelete(timeslot.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TimeslotList;
