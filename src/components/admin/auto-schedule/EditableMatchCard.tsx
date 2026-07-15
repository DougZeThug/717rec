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

const timeSlotOptions = [
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
];

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
  const getTeamById = (id: string | null) => {
    if (!id) return null;
    return teams.find((t) => t.id === id) || null;
  };

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);

  return (
    <div
      className={`p-4 border rounded-lg bg-card shadow-sm ${
        hasError
          ? 'border-destructive'
          : hasWarning
            ? 'border-amber-400 dark:border-amber-500/60 border-l-4'
            : ''
      }`}
    >
      {hasError && errorMessage && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
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
          <div className="flex-1 min-w-0">
            <label
              htmlFor={`team1-${match.id}`}
              className="text-xs text-muted-foreground mb-1 block"
            >
              Team 1
            </label>
            <Select
              value={match.team1Id || ''}
              onValueChange={(value) => onUpdateTeam(match.id, 'team1', value)}
            >
              <SelectTrigger id={`team1-${match.id}`} className="w-full">
                <SelectValue placeholder="Select team">
                  {team1 && (
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        imageUrl={team1.imageUrl || ''}
                        teamName={team1.name}
                        className="size-4 shrink-0"
                      />
                      <span className="truncate">{team1.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-[300px] overflow-auto">
                  {teams
                    .filter((team) => team.id !== match.team2Id)
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

          {/* Swap Button - Rotate icon on mobile */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSwapTeams(match.id)}
            className="self-center sm:mt-5 shrink-0"
            title="Swap teams"
            aria-label="Swap teams"
          >
            <ArrowLeftRight className="size-4 rotate-90 sm:rotate-0" />
          </Button>

          {/* Team 2 */}
          <div className="flex-1 min-w-0">
            <label
              htmlFor={`team2-${match.id}`}
              className="text-xs text-muted-foreground mb-1 block"
            >
              Team 2
            </label>
            <Select
              value={match.team2Id || ''}
              onValueChange={(value) => onUpdateTeam(match.id, 'team2', value)}
            >
              <SelectTrigger id={`team2-${match.id}`} className="w-full">
                <SelectValue placeholder="Select team">
                  {team2 && (
                    <div className="flex items-center gap-2">
                      <TeamLogo
                        imageUrl={team2.imageUrl || ''}
                        teamName={team2.name}
                        className="size-4 shrink-0"
                      />
                      <span className="truncate">{team2.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-[300px] overflow-auto">
                  {teams
                    .filter((team) => team.id !== match.team1Id)
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
        </div>

        {/* Timeslot and Actions */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label
              htmlFor={`timeslot-${match.id}`}
              className="text-xs text-muted-foreground mb-1 block"
            >
              Timeslot
            </label>
            <Select
              value={match.timeslot || ''}
              onValueChange={(value) => onUpdateTimeslot(match.id, value)}
            >
              <SelectTrigger id={`timeslot-${match.id}`} className="w-full">
                <SelectValue placeholder="Select time" />
              </SelectTrigger>
              <SelectContent>
                {timeSlotOptions.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
