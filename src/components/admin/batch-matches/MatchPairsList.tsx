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

  /** Looks up a team from the teams prop by id; returns null for missing or empty ids. */
  const getTeamById = (id: string | null) => {
    if (!id) return null;
    return teams.find((t) => t.id === id) || null;
  };

  return (
    <div className="space-y-3">
      {pairs.map((pair, index) => {
        const error = errors[pair.id];
        const errorId = `pair-error-${pair.id}`;

        return (
          <div
            key={pair.id}
            className={cn(
              'p-3 border rounded-lg bg-card shadow-sm',
              error && 'border-destructive ring-1 ring-destructive'
            )}
          >
            <p className="text-xs font-medium text-muted-foreground mb-2">Match {index + 1}</p>
            <div className="flex flex-col md:flex-row gap-3">
              {/* Team 1 Selection */}
              <div className="flex-1">
                <label
                  htmlFor={`pair-team1-${pair.id}`}
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Team 1
                </label>
                <Select
                  value={pair.team1Id || ''}
                  onValueChange={(value) => onUpdate(pair.id, { team1Id: value })}
                >
                  <SelectTrigger
                    id={`pair-team1-${pair.id}`}
                    className="w-full"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                  >
                    <SelectValue placeholder="Select team">
                      {pair.team1Id && (
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            imageUrl={getTeamById(pair.team1Id)?.imageUrl || ''}
                            teamName={getTeamById(pair.team1Id)?.name || ''}
                            className="size-4"
                          />
                          <span>{getTeamById(pair.team1Id)?.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="max-h-[300px] overflow-auto">
                      {teams
                        .filter((team) => team.id !== pair.team2Id)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <TeamLogo
                                imageUrl={team.imageUrl || ''}
                                teamName={team.name}
                                className="size-4"
                              />
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* VS Symbol */}
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-muted-foreground">VS</span>
              </div>

              {/* Team 2 Selection */}
              <div className="flex-1">
                <label
                  htmlFor={`pair-team2-${pair.id}`}
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Team 2
                </label>
                <Select
                  value={pair.team2Id || ''}
                  onValueChange={(value) => onUpdate(pair.id, { team2Id: value })}
                >
                  <SelectTrigger
                    id={`pair-team2-${pair.id}`}
                    className="w-full"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                  >
                    <SelectValue placeholder="Select team">
                      {pair.team2Id && (
                        <div className="flex items-center gap-2">
                          <TeamLogo
                            imageUrl={getTeamById(pair.team2Id)?.imageUrl || ''}
                            teamName={getTeamById(pair.team2Id)?.name || ''}
                            className="size-4"
                          />
                          <span>{getTeamById(pair.team2Id)?.name}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="max-h-[300px] overflow-auto">
                      {teams
                        .filter((team) => team.id !== pair.team1Id)
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            <div className="flex items-center gap-2">
                              <TeamLogo
                                imageUrl={team.imageUrl || ''}
                                teamName={team.name}
                                className="size-4"
                              />
                              <span>{team.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeslot Selection */}
              <div className="md:w-[150px]">
                <label
                  htmlFor={`pair-timeslot-${pair.id}`}
                  className="text-xs text-muted-foreground mb-1 block"
                >
                  Timeslot
                </label>
                <Select
                  value={pair.timeslot || ''}
                  onValueChange={(value) => onUpdate(pair.id, { timeslot: value })}
                >
                  <SelectTrigger
                    id={`pair-timeslot-${pair.id}`}
                    className="w-full"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
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

              {/* Delete Button */}
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
      })}
    </div>
  );
};

export default MatchPairsList;
