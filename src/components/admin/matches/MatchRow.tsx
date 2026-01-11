import { X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

import { MatchPair } from './types';

interface MatchRowProps {
  match: MatchPair;
  teams: Team[];
  onUpdate: (updates: Partial<MatchPair>) => void;
  onRemove: () => void;
}

const timeSlots = [
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
];

const MatchRow = ({ match, teams, onUpdate, onRemove }: MatchRowProps) => {
  // Filter out the current team1Id when populating team2 dropdown
  const availableTeamsForTeam2 = teams.filter((team) => team.id !== match.team1Id);

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={match.team1Id || ''} onValueChange={(value) => onUpdate({ team1Id: value })}>
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

        <Select value={match.team2Id || ''} onValueChange={(value) => onUpdate({ team2Id: value })}>
          <SelectTrigger>
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

      <div className="flex items-center gap-3">
        <Select
          value={match.timeslot || ''}
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

        <Button variant="ghost" size="icon" onClick={onRemove} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MatchRow;
