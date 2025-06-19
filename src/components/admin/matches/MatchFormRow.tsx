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
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:30 PM",
  "10:00 PM"
];

const MatchFormRow = ({ match, teams, onUpdate, onRemove }: MatchFormRowProps) => {
  // Filter out the current team1Id when populating team2 dropdown
  const availableTeamsForTeam2 = teams.filter(team => 
    team.id !== match.team1Id
  );

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 gap-3">
        <Select
          value={match.team1Id || ""}
          onValueChange={(value) => onUpdate({ team1Id: value })}
        >
          <SelectTrigger className="w-full">
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

        <div className="flex items-center justify-center text-sm text-muted-foreground">
          vs
        </div>

        <Select
          value={match.team2Id || ""}
          onValueChange={(value) => onUpdate({ team2Id: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Team 2" />
          </SelectTrigger>
          <SelectContent>
            {availableTeamsForTeam2.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={match.timeslot || ""}
          onValueChange={(value) => onUpdate({ timeslot: value })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select Time" />
          </SelectTrigger>
          <SelectContent>
            {timeSlots.map((slot) => (
              <SelectItem key={slot} value={slot}>
                {slot}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MatchFormRow;
