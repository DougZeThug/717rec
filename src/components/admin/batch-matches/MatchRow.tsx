import { motion } from 'framer-motion';
import { Clock, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Team } from '@/types';

import { MatchPair } from './MatchPairsList';

interface MatchRowProps {
  pair: MatchPair;
  teams: Team[];
  onUpdate: (updates: Partial<MatchPair>) => void;
  onRemove: () => void;
}

const MatchRow: React.FC<MatchRowProps> = ({ pair, teams, onUpdate, onRemove }) => {
  // Only filter out the current team1Id when populating team2 dropdown
  const availableTeamsForTeam2 = teams.filter((team) => team.id !== pair.team1Id);

  // Format time properly for display
  const formatTimeForDisplay = (time: string | null) => {
    if (!time) return '';

    // If time is already in 12-hour format (e.g., "6:30 PM"), return as is
    if (time.includes('AM') || time.includes('PM')) {
      return time;
    }

    // If time is in 24-hour format (e.g., "18:30"), convert to 12-hour
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours, 10);
      const suffix = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${minutes} ${suffix}`;
    } catch (e) {
      return time; // Return original if parsing fails
    }
  };

  const [team1Name, setTeam1Name] = useState<string>('Select Team 1');
  const [team2Name, setTeam2Name] = useState<string>('Select Team 2');
  const [timeslotFormatted, setTimeslotFormatted] = useState<string>('');

  useEffect(() => {
    if (pair.team1Id) {
      const team = teams.find((t) => t.id === pair.team1Id);
      if (team) setTeam1Name(team.name);
    }

    if (pair.team2Id) {
      const team = teams.find((t) => t.id === pair.team2Id);
      if (team) setTeam2Name(team.name);
    }

    if (pair.timeslot) {
      setTimeslotFormatted(formatTimeForDisplay(pair.timeslot));
    }
  }, [pair.team1Id, pair.team2Id, pair.timeslot, teams]);

  const showPreview = pair.team1Id && pair.team2Id && pair.timeslot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3 p-4 border rounded-lg bg-card shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 space-y-1">
          <div className="flex items-center gap-1 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Team 1</label>
          </div>
          <Select
            value={pair.team1Id || ''}
            onValueChange={(value) => onUpdate({ team1Id: value })}
          >
            <SelectTrigger className="w-full min-h-[44px]">
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
          <p className="text-xs text-muted-foreground">Select the home team</p>
        </div>

        <div className="flex items-center justify-center text-sm text-muted-foreground sm:col-span-2">
          vs
        </div>

        <div className="sm:col-span-5 space-y-1">
          <div className="flex items-center gap-1 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Team 2</label>
          </div>
          <Select
            value={pair.team2Id || ''}
            onValueChange={(value) => onUpdate({ team2Id: value })}
          >
            <SelectTrigger className="w-full min-h-[44px]">
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
          <p className="text-xs text-muted-foreground">Select the away team</p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <label className="text-sm font-medium">Match Time</label>
          </div>
          <Select
            value={pair.timeslot || ''}
            onValueChange={(value) => onUpdate({ timeslot: value })}
          >
            <SelectTrigger className="flex-1 min-h-[44px]">
              <SelectValue placeholder="Select Time" />
            </SelectTrigger>
            <SelectContent>
              {[
                '5:00 PM',
                '5:30 PM',
                '6:00 PM',
                '6:30 PM',
                '7:00 PM',
                '7:30 PM',
                '8:00 PM',
                '8:30 PM',
                '9:00 PM',
                '9:30 PM',
                '10:00 PM',
              ].map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Pick a time for the match</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {showPreview && (
        <div className="mt-2 text-sm px-3 py-2 bg-muted/50 rounded-md flex items-center gap-2">
          <span className="text-base">📋</span>
          <p className="text-muted-foreground">
            <span className="font-medium">Match Preview:</span> {team1Name} vs {team2Name} at{' '}
            {timeslotFormatted}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default MatchRow;
