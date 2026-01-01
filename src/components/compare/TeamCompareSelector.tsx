import React from "react";
import { Team } from "@/types";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TeamCompareSelectorProps {
  teams: Team[];
  team1: Team | null;
  team2: Team | null;
  onTeam1Change: (team: Team | null) => void;
  onTeam2Change: (team: Team | null) => void;
  onSwap: () => void;
}

const TeamOption: React.FC<{ team: Team }> = ({ team }) => (
  <div className="flex items-center gap-2">
    <Avatar className="h-6 w-6">
      <AvatarImage src={team.logoUrl || undefined} alt={team.name} />
      <AvatarFallback className="text-xs bg-muted">
        {team.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="truncate">{team.name}</span>
  </div>
);

export const TeamCompareSelector: React.FC<TeamCompareSelectorProps> = ({
  teams,
  team1,
  team2,
  onTeam1Change,
  onTeam2Change,
  onSwap,
}) => {
  const handleTeam1Change = (value: string) => {
    const team = teams.find((t) => t.id === value) || null;
    onTeam1Change(team);
  };

  const handleTeam2Change = (value: string) => {
    const team = teams.find((t) => t.id === value) || null;
    onTeam2Change(team);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full">
      {/* Team 1 Selector */}
      <div className="flex-1 w-full">
        <Select value={team1?.id || ""} onValueChange={handleTeam1Change}>
          <SelectTrigger className="w-full h-12">
            <SelectValue placeholder="Select Team 1">
              {team1 && <TeamOption team={team1} />}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teams
              .filter((t) => t.id !== team2?.id)
              .map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <TeamOption team={team} />
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Swap Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onSwap}
        disabled={!team1 && !team2}
        className="shrink-0"
      >
        <ArrowLeftRight className="h-4 w-4" />
      </Button>

      {/* Team 2 Selector */}
      <div className="flex-1 w-full">
        <Select value={team2?.id || ""} onValueChange={handleTeam2Change}>
          <SelectTrigger className="w-full h-12">
            <SelectValue placeholder="Select Team 2">
              {team2 && <TeamOption team={team2} />}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {teams
              .filter((t) => t.id !== team1?.id)
              .map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <TeamOption team={team} />
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
