
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
import { MatchPair } from "./MatchPairsList";

interface MatchRowProps {
  pair: MatchPair;
  teams: Team[];
  onUpdate: (updates: Partial<MatchPair>) => void;
  onRemove: () => void;
}

const MatchRow = ({ pair, teams, onUpdate, onRemove }: MatchRowProps) => {
  const availableTeams = teams.filter(team => 
    team.id !== pair.team1Id && team.id !== pair.team2Id
  );

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 gap-3">
        <Select
          value={pair.team1Id || ""}
          onValueChange={(value) => onUpdate({ team1Id: value })}
        >
          <SelectTrigger>
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
          value={pair.team2Id || ""}
          onValueChange={(value) => onUpdate({ team2Id: value })}
        >
          <SelectTrigger>
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
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={pair.timeslot || ""}
          onValueChange={(value) => onUpdate({ timeslot: value })}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select Time" />
          </SelectTrigger>
          <SelectContent>
            {["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"].map((slot) => (
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

export default MatchRow;
