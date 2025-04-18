
import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Team } from "@/types";
import { MatchPair } from "./types";

interface MatchFormRowProps {
  match: MatchPair;
  teams: Team[];
  onUpdate: (updates: Partial<MatchPair>) => void;
  onRemove: () => void;
}

const timeSlots = [
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM"
];

const MatchFormRow = ({ match, teams, onUpdate, onRemove }: MatchFormRowProps) => {
  const availableTeams = teams.filter(team => 
    team.id !== match.team1Id && team.id !== match.team2Id
  );

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      <Select
        value={match.team1Id || ""}
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
        value={match.team2Id || ""}
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
        value={match.timeslot || ""}
        onValueChange={(value) => onUpdate({ timeslot: value })}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Time" />
        </SelectTrigger>
        <SelectContent>
          {timeSlots.map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
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

export default MatchFormRow;
