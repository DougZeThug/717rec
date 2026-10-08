import { ArrowLeftRight, RotateCcw } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { AutoScheduleMatch, Team } from '@/types';
import { ALL_BLOCK_TIMES } from '@/utils/autoSchedule/constants';

interface EditableMatchCardProps {
  match: AutoScheduleMatch;
  teams: Team[];
  onUpdateTeam: (matchId: string, teamPosition: 'team1' | 'team2', newTeamId: string) => void;
  onUpdateTimeslot: (matchId: string, newTimeslot: string) => void;
  onSwapTeams: (matchId: string) => void;
  onRemove: (matchId: string) => void;
  hasError?: boolean;
  errorMessage?: string;
  hasWarning?: boolean;
  warningMessage?: string;
}

interface TeamSelectProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  selectedTeam: Team | null;
  options: Team[];
}

const TeamSelect: React.FC<TeamSelectProps> = ({
  id,
  label,
  value,
  onValueChange,
  selectedTeam,
  options,
}) => (
  <div className="flex-1 min-w-0">
    <label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">
      {label}
    </label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select team">
          {selectedTeam && (
            <div className="flex items-center gap-2">
              <TeamLogo
                imageUrl={selectedTeam.imageUrl || ''}
                teamName={selectedTeam.name}
                className="size-4 shrink-0"
              />
              <span className="truncate">{selectedTeam.name}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <div className="max-h-[300px] overflow-auto">
          {options.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              <div className="flex items-center gap-2">
                <TeamLogo imageUrl={team.imageUrl || ''} teamName={team.name} className="size-4" />
                <span>{team.name}</span>
              </div>
            </SelectItem>
          ))}
        </div>
      </SelectContent>
    </Select>
  </div>
);

interface TimeslotSelectProps {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
}

const TimeslotSelect: React.FC<TimeslotSelectProps> = ({ id, value, onValueChange }) => (
  <div className="flex-1">
    <label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">
      Timeslot
    </label>
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Select time" />
      </SelectTrigger>
      <SelectContent>
        {ALL_BLOCK_TIMES.map((time) => (
          <SelectItem key={time} value={time}>
            {time}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

/** Icon button that swaps team 1 and team 2. */
const SwapTeamsButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    className="self-center sm:mt-5 shrink-0"
    title="Swap teams"
    aria-label="Swap teams"
  >
    <ArrowLeftRight className="size-4 rotate-90 sm:rotate-0" />
  </Button>
);

/** Card for editing one auto-scheduled match: team pickers, timeslot, swap, and remove. */
const EditableMatchCard: React.FC<EditableMatchCardProps> = ({
  match,
  teams,
  onUpdateTeam,
  onUpdateTimeslot,
  onSwapTeams,
  onRemove,
  hasError,
  errorMessage,
  hasWarning,
  warningMessage,
}) => {
  /** Find a team in the provided list by id; returns null when id is empty or not found. */
  const getTeamById = (id: string | null) => {
    if (!id) return null;
    return teams.find((t) => t.id === id) || null;
  };

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  return (
    <div
      className={`p-4 border rounded-lg bg-card shadow-xs ${
        hasError
          ? 'border-destructive'
          : hasWarning
            ? 'border-amber-400 dark:border-amber-500/60 border-l-4'
            : ''
      }`}
    >
      {hasError && errorMessage && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive-text">
          {errorMessage}
        </div>
      )}

      {hasWarning && !hasError && (
        <div
          className="mb-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"
          title="These teams have already played each other this season"
        >
          <RotateCcw className="size-4" />
          <span>{warningMessage ?? 'Rematch — these teams have already played'}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {/* Team Selections - Stack on mobile, row on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Team 1 */}
          <TeamSelect
            id={`team1-${match.id}`}
            label="Team 1"
            value={match.team1Id || ''}
            onValueChange={(value) => onUpdateTeam(match.id, 'team1', value)}
            selectedTeam={team1}
            options={teams.filter((team) => team.id !== match.team2Id)}
          />

          {/* Swap Button - Rotate icon on mobile */}
          <SwapTeamsButton onClick={() => onSwapTeams(match.id)} />

          {/* Team 2 */}
          <TeamSelect
            id={`team2-${match.id}`}
            label="Team 2"
            value={match.team2Id || ''}
            onValueChange={(value) => onUpdateTeam(match.id, 'team2', value)}
            selectedTeam={team2}
            options={teams.filter((team) => team.id !== match.team1Id)}
          />
        </div>

        {/* Timeslot and Actions */}
        <div className="flex items-end gap-3">
          <TimeslotSelect
            id={`timeslot-${match.id}`}
            value={match.timeslot || ''}
            onValueChange={(value) => onUpdateTimeslot(match.id, value)}
          />

          <DestructiveIconButton
            onClick={() => onRemove(match.id)}
            title="Remove match"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};

export default EditableMatchCard;
