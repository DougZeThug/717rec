
import React from "react";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamSelectorProps } from "./types";

const TeamSelector: React.FC<TeamSelectorProps> = ({
  teamId,
  setTeamId,
  otherTeamId,
  teams,
  label,
  placeholder
}) => {
  return (
    <div>
      <Label htmlFor={`team-${label}`}>{label}</Label>
      <Select 
        value={teamId} 
        onValueChange={setTeamId}
        required
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {teams
            .filter(team => team.id !== otherTeamId)
            .map(team => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))
          }
        </SelectContent>
      </Select>
    </div>
  );
};

export default TeamSelector;
