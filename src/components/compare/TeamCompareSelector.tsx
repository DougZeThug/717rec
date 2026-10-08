import { ArrowLeftRight } from 'lucide-react';
import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

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
    <Avatar className="size-6">
      <AvatarImage src={team.logoUrl || undefined} alt={team.name} />
      <AvatarFallback className="text-xs bg-muted">
        {team.name.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="truncate">{team.name}</span>
  </div>
);

interface TeamSelectProps {
  label: string;
  teams: Team[];
  selected: Team | null;
  /** The team picked on the other side, left out of this list. */
  excluded: Team | null;
  onChange: (value: string) => void;
}

const TeamSelect: React.FC<TeamSelectProps> = ({ label, teams, selected, excluded, onChange }) => (
  <Select value={selected?.id || ''} onValueChange={onChange}>
    {/* The placeholder is the only text here, and it disappears the
        moment a team is picked, leaving the control with no name. */}
    <SelectTrigger className="w-full h-12" aria-label={label}>
      <SelectValue placeholder={`Select ${label}`}>
        {selected && <TeamOption team={selected} />}
      </SelectValue>
    </SelectTrigger>
    <SelectContent>
      {teams
        .filter((t) => t.id !== excluded?.id)
        .map((team) => (
          <SelectItem key={team.id} value={team.id}>
            <TeamOption team={team} />
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
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
        <TeamSelect
          label="Team 1"
          teams={teams}
          selected={team1}
          excluded={team2}
          onChange={handleTeam1Change}
        />
      </div>

      {/* Swap Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={onSwap}
        disabled={!team1 && !team2}
        className="shrink-0"
        aria-label="Swap teams"
      >
        <ArrowLeftRight className="size-4" aria-hidden="true" />
      </Button>

      {/* Team 2 Selector */}
      <div className="flex-1 w-full">
        <TeamSelect
          label="Team 2"
          teams={teams}
          selected={team2}
          excluded={team1}
          onChange={handleTeam2Change}
        />
      </div>
    </div>
  );
};
