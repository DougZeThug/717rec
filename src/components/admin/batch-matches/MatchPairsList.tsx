import React from 'react';

import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { cn } from '@/lib/utils';
import { Team } from '@/types';
import { ALL_BLOCK_TIMES } from '@/utils/autoSchedule/constants';

export interface MatchPair {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  timeslot: string | null;
}

interface MatchPairsListProps {
  pairs: MatchPair[];
  teams: Team[];
  onUpdate: (id: string, updates: Partial<MatchPair>) => void;
  onRemove: (id: string) => void;
  /** Message per row id, from the last attempt to submit. */
  errors?: Record<string, string>;
}

/** Logo and name, shown both in the closed select and in each option. */
const TeamOption: React.FC<{ team: Team | null }> = ({ team }) => (
  <div className="flex items-center gap-2">
    <TeamLogo imageUrl={team?.imageUrl || ''} teamName={team?.name || ''} className="size-4" />
    <span>{team?.name}</span>
  </div>
);

/** The options list. Its own component so the item tree stays shallow. */
const TeamOptions: React.FC<{ teams: Team[]; excludeTeamId: string | null }> = ({
  teams,
  excludeTeamId,
}) => (
  <div className="max-h-[300px] overflow-auto">
    {teams
      .filter((team) => team.id !== excludeTeamId)
      .map((team) => (
        <SelectItem key={team.id} value={team.id}>
          <TeamOption team={team} />
        </SelectItem>
      ))}
  </div>
);

interface TeamPickerProps {
  id: string;
  value: string | null;
  excludeTeamId: string | null;
  teams: Team[];
  invalid: boolean;
  describedBy?: string;
  onChange: (teamId: string) => void;
}

const TeamPicker: React.FC<TeamPickerProps> = ({
  id,
  value,
  excludeTeamId,
  teams,
  invalid,
  describedBy,
  onChange,
}) => {
  const selected = value ? (teams.find((team) => team.id === value) ?? null) : null;

  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Select team">
          {selected && <TeamOption team={selected} />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <TeamOptions teams={teams} excludeTeamId={excludeTeamId} />
      </SelectContent>
    </Select>
  );
};

interface TeamSelectProps {
  id: string;
  label: string;
  value: string | null;
  /** The other side of this match, which cannot also be this side. */
  excludeTeamId: string | null;
  teams: Team[];
  invalid: boolean;
  describedBy?: string;
  onChange: (teamId: string) => void;
}

/** One side of a pairing. Both sides are the same control with a different label. */
const TeamSelect: React.FC<TeamSelectProps> = ({ id, label, ...picker }) => (
  <div className="flex-1">
    <label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">
      {label}
    </label>
    <TeamPicker id={id} {...picker} />
  </div>
);

interface TimeslotSelectProps {
  id: string;
  value: string | null;
  invalid: boolean;
  describedBy?: string;
  onChange: (timeslot: string) => void;
}

const TimeslotSelect: React.FC<TimeslotSelectProps> = ({
  id,
  value,
  invalid,
  describedBy,
  onChange,
}) => (
  <div className="md:w-[150px]">
    <label htmlFor={id} className="text-xs text-muted-foreground mb-1 block">
      Timeslot
    </label>
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
      >
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

interface MatchPairRowProps {
  pair: MatchPair;
  rowNumber: number;
  teams: Team[];
  error?: string;
  onUpdate: (id: string, updates: Partial<MatchPair>) => void;
  onRemove: (id: string) => void;
}

const MatchPairRow: React.FC<MatchPairRowProps> = ({
  pair,
  rowNumber,
  teams,
  error,
  onUpdate,
  onRemove,
}) => {
  const errorId = `pair-error-${pair.id}`;
  const describedBy = error ? errorId : undefined;
  const invalid = Boolean(error);

  return (
    <div
      className={cn(
        'p-3 border rounded-lg bg-card shadow-sm',
        error && 'border-destructive ring-1 ring-destructive'
      )}
    >
      {/* Numbered so the validation message can point at a row on screen (A-18). */}
      <p className="text-xs font-medium text-muted-foreground mb-2">Match {rowNumber}</p>
      <div className="flex flex-col md:flex-row gap-3">
        <TeamSelect
          id={`pair-team1-${pair.id}`}
          label="Team 1"
          value={pair.team1Id}
          excludeTeamId={pair.team2Id}
          teams={teams}
          invalid={invalid}
          describedBy={describedBy}
          onChange={(team1Id) => onUpdate(pair.id, { team1Id })}
        />

        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-muted-foreground">VS</span>
        </div>

        <TeamSelect
          id={`pair-team2-${pair.id}`}
          label="Team 2"
          value={pair.team2Id}
          excludeTeamId={pair.team1Id}
          teams={teams}
          invalid={invalid}
          describedBy={describedBy}
          onChange={(team2Id) => onUpdate(pair.id, { team2Id })}
        />

        <TimeslotSelect
          id={`pair-timeslot-${pair.id}`}
          value={pair.timeslot}
          invalid={invalid}
          describedBy={describedBy}
          onChange={(timeslot) => onUpdate(pair.id, { timeslot })}
        />

        <div className="flex items-end justify-end pb-0.5 mt-auto">
          <DestructiveIconButton
            onClick={() => onRemove(pair.id)}
            title="Remove match pair"
            size="sm"
          />
        </div>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

/** Editable list of match pairings with team/timeslot selects; shows an empty state when none. */
const MatchPairsList: React.FC<MatchPairsListProps> = ({
  pairs,
  teams,
  onUpdate,
  onRemove,
  errors = {},
}) => {
  if (pairs.length === 0) {
    return (
      <div className="text-center py-6 border rounded-lg bg-card text-muted-foreground">
        <p>No match pairs added yet</p>
        <p className="text-sm mt-1">Add teams to create match pairings</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pairs.map((pair, index) => (
        <MatchPairRow
          key={pair.id}
          pair={pair}
          rowNumber={index + 1}
          teams={teams}
          error={errors[pair.id]}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export default MatchPairsList;
