import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Team, TeamTimeslot } from '@/types';

import { TimeslotBlockPicker } from './TimeslotBlockPicker';
import { TimeslotTeamGrid } from './TimeslotTeamGrid';

interface TimeslotAssignmentProps {
  selectedDate: Date;
  teams: Team[];
  existingTimeslots: TeamTimeslot[];
  onAssign: (teamId: string, timeslot: string) => void;
  onBatchAssign?: (teamIds: string[], timeslot: string) => void;
  onBatchAssignDoubleHeaders?: (teamIds: string[], slot1: string, slot2: string) => void;
  /** True while a booking is on its way, so Confirm cannot be pressed twice. */
  isSubmitting?: boolean;
}

/** What the Confirm button reads from the form to decide its state and text. */
interface SubmitState {
  isSubmitting: boolean;
  isDoubleHeader: boolean;
  batchMode: boolean;
  /** Ticked teams that are still free on the date. */
  teamCount: number;
  teamId: string;
  selectedTimeslot: string;
  selectedTimeslotCount: number;
  hasAvailableTeams: boolean;
}

// Confirm needs a team and a time (two times for a double header), a date with
// a team still free, and no booking already on its way.
const isSubmitDisabled = (state: SubmitState): boolean =>
  (state.isDoubleHeader &&
    (state.selectedTimeslotCount !== 2 ||
      (state.batchMode && state.teamCount === 0) ||
      (!state.batchMode && !state.teamId))) ||
  (!state.isDoubleHeader &&
    ((state.batchMode && (!state.selectedTimeslot || state.teamCount === 0)) ||
      (!state.batchMode && (!state.teamId || !state.selectedTimeslot)))) ||
  !state.hasAvailableTeams ||
  state.isSubmitting;

const countTeams = (count: number) => `${count} Team${count !== 1 ? 's' : ''}`;

const submitLabel = (state: SubmitState): string => {
  if (state.isSubmitting) return 'Booking…';
  if (state.isDoubleHeader) return `Confirm Double Header (${countTeams(state.teamCount)})`;
  return state.batchMode
    ? `Confirm Assignment (${countTeams(state.teamCount)})`
    : 'Confirm Assignment';
};

const TimeslotAssignment: React.FC<TimeslotAssignmentProps> = ({
  selectedDate: _selectedDate,
  teams,
  existingTimeslots,
  onAssign,
  onBatchAssign,
  onBatchAssignDoubleHeaders,
  isSubmitting = false,
}) => {
  const [teamId, setTeamId] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState<string>('');
  const [batchMode, _setBatchMode] = useState<boolean>(true); // Default to true for batch mode
  const [isDoubleHeader, setIsDoubleHeader] = useState<boolean>(false);
  const [selectedTimeslots, setSelectedTimeslots] = useState<string[]>([]);

  // Filter out teams that already have a timeslot for this date
  const assignedTeamIds = useMemo(
    () => existingTimeslots.map((ts) => ts.team_id),
    [existingTimeslots]
  );
  const availableTeams = useMemo(
    () => teams.filter((team) => !assignedTeamIds.includes(team.id)),
    [teams, assignedTeamIds]
  );

  // The ticked teams this date can still take. Ticks survive a change of date,
  // and the grid hides a team once it has a booking, but the count, the button
  // and the submit used to keep it, so a team ticked on one night was booked a
  // second time on a night it already had. Derived rather than pruned, so a
  // team that frees up again comes back ticked, like the rest of the selection.
  const validSelectedTeamIds = useMemo(() => {
    const availableIds = new Set(availableTeams.map((team) => team.id));
    return selectedTeamIds.filter((id) => availableIds.has(id));
  }, [availableTeams, selectedTeamIds]);

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAll = () => {
    if (validSelectedTeamIds.length === availableTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(availableTeams.map((team) => team.id));
    }
  };

  const handleTimeslotToggle = (timeslot: string) => {
    if (isDoubleHeader) {
      // In double header mode, allow selecting up to 2 timeslots
      setSelectedTimeslots((prev) => {
        if (prev.includes(timeslot)) {
          return prev.filter((t) => t !== timeslot);
        }
        if (prev.length < 2) {
          return [...prev, timeslot];
        }
        // Replace the first selection if already have 2
        return [prev[1], timeslot];
      });
    } else {
      // Single timeslot mode
      setSelectedTimeslot(timeslot);
    }
  };

  const handleDoubleHeaderToggle = (checked: boolean) => {
    setIsDoubleHeader(checked);
    // Reset selections when toggling mode
    setSelectedTimeslot('');
    setSelectedTimeslots([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isDoubleHeader) {
      // Double header mode - need two timeslots selected
      if (selectedTimeslots.length !== 2) {
        return;
      }
      if (batchMode) {
        if (validSelectedTeamIds.length > 0 && onBatchAssignDoubleHeaders) {
          onBatchAssignDoubleHeaders(
            validSelectedTeamIds,
            selectedTimeslots[0],
            selectedTimeslots[1]
          );
          setSelectedTeamIds([]);
        }
      }
    } else {
      // Regular single timeslot mode
      if (!selectedTimeslot) {
        return;
      }

      if (batchMode) {
        if (validSelectedTeamIds.length > 0 && onBatchAssign) {
          onBatchAssign(validSelectedTeamIds, selectedTimeslot);
          setSelectedTeamIds([]);
        }
      } else {
        if (teamId) {
          onAssign(teamId, selectedTimeslot);
          setTeamId('');
        }
      }
    }

    // Keep the selected timeslot(s) for convenience when making multiple assignments
  };

  const submitState: SubmitState = {
    isSubmitting,
    isDoubleHeader,
    batchMode,
    teamCount: validSelectedTeamIds.length,
    teamId,
    selectedTimeslot,
    selectedTimeslotCount: selectedTimeslots.length,
    hasAvailableTeams: availableTeams.length > 0,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {!batchMode ? (
        <div className="space-y-2">
          <label htmlFor="teamSelect" className="block text-sm font-medium">
            Select Team
          </label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger id="teamSelect" className="w-full">
              <SelectValue placeholder="Select a team" />
            </SelectTrigger>
            <SelectContent>
              {availableTeams.length === 0 ? (
                <SelectItem value="none" disabled>
                  All teams have been assigned for this date
                </SelectItem>
              ) : (
                availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <TimeslotTeamGrid
          availableTeams={availableTeams}
          selectedTeamIds={validSelectedTeamIds}
          onToggleTeam={handleToggleTeam}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Double Header Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-2.5 shadow-xs">
        <div className="space-y-0.5">
          <Label htmlFor="double-header-toggle" className="text-sm font-medium">
            Double Header
          </Label>
          <p className="text-xs text-muted-foreground">
            Schedule team for two separate timeslot blocks
          </p>
        </div>
        <Switch
          id="double-header-toggle"
          checked={isDoubleHeader}
          onCheckedChange={handleDoubleHeaderToggle}
        />
      </div>

      <TimeslotBlockPicker
        isDoubleHeader={isDoubleHeader}
        selectedTimeslot={selectedTimeslot}
        selectedTimeslots={selectedTimeslots}
        onSelectTimeslot={setSelectedTimeslot}
        onToggleTimeslot={handleTimeslotToggle}
      />

      <Button
        type="submit"
        className={`w-full disabled:opacity-100! disabled:bg-muted! disabled:text-muted-foreground! ${isDoubleHeader ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'bg-cornhole-navy hover:bg-cornhole-navy/90'}`}
        disabled={isSubmitDisabled(submitState)}
      >
        {submitLabel(submitState)}
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
