
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Team } from "@/types";
import { X } from "lucide-react";

interface MatchPair {
  team1Id: string | null;
  team2Id: string | null;
  timeslot: string | null;
}

interface MatchRowProps {
  pair: MatchPair;
  teams: Team[];
  onUpdate: (updates: Partial<MatchPair>) => void;
  onRemove: () => void;
}

const MatchRow = ({ pair, teams, onUpdate, onRemove }: MatchRowProps) => {
  const timeslots = [
    { value: '18:30', label: '6:30 PM' },
    { value: '19:30', label: '7:30 PM' },
    { value: '20:30', label: '8:30 PM' },
  ];

  const availableTeams = teams.filter(team => 
    team.id !== pair.team1Id && team.id !== pair.team2Id
  );

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      <Select
        value={pair.team1Id || ""}
        onValueChange={(value) => onUpdate({ team1Id: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Team 1" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-muted-foreground">vs</span>

      <Select
        value={pair.team2Id || ""}
        onValueChange={(value) => onUpdate({ team2Id: value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select Team 2" />
        </SelectTrigger>
        <SelectContent>
          {availableTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={pair.timeslot || ""}
        onValueChange={(value) => onUpdate({ timeslot: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          {timeslots.map((slot) => (
            <SelectItem key={slot.value} value={slot.value}>
              {slot.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="ml-auto"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MatchRow;
