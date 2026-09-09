import { Check } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Team, TeamTimeslot } from '@/types';
import { BACK_TO_BACK_PAIRS, DOUBLE_HEADER_START_TIMES } from '@/utils/autoSchedule/constants';

/**
 * One chip per block, plus BYE.
 *
 * A timeslot is never booked on its own: every assignment writes the chosen
 * time *and* the thirty minutes after it, as a back-to-back pair. The chips used
 * to read "6:30 PM", so an admin picking one got two rows they never asked for.
 * They now say what is booked.
 *
 * The value submitted is still the block's first time, which is what the
 * service takes. That also drops 9:30 PM, which is the second half of the 9:00
 * block and no block's start: picking it used to fail on confirm.
 */
const BLOCK_CHOICES: Array<{ value: string; label: string; description: string }> = [
  { value: 'BYE', label: 'BYE WEEK', description: 'No match this week' },
  ...Object.values(BACK_TO_BACK_PAIRS).map((pair) => ({
    value: pair.primary,
    label: `${pair.primary.replace(' PM', '')} + ${pair.secondary}`,
    description: `Books ${pair.primary} and ${pair.secondary}`,
  })),
];

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

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTeamIds.length === availableTeams.length) {
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
        if (selectedTeamIds.length > 0 && onBatchAssignDoubleHeaders) {
          onBatchAssignDoubleHeaders(selectedTeamIds, selectedTimeslots[0], selectedTimeslots[1]);
          setSelectedTeamIds([]);
        }
      }
    } else {
      // Regular single timeslot mode
      if (!selectedTimeslot) {
        return;
      }

      if (batchMode) {
        if (selectedTeamIds.length > 0 && onBatchAssign) {
          onBatchAssign(selectedTeamIds, selectedTimeslot);
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
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="block text-sm font-medium">Team Selection Grid</span>
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedTeamIds.length === availableTeams.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-2">
            {availableTeams.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                All teams have been assigned for this date
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableTeams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <div
                      key={team.id}
                      role="button"
                      tabIndex={0}
                      title={team.name}
                      aria-pressed={isSelected}
                      onClick={() => handleToggleTeam(team.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleTeam(team.id);
                        }
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left cursor-pointer ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                      }`}
                    >
                      <TeamLogo
                        imageUrl={team.imageUrl || team.logoUrl}
                        teamName={team.name}
                        size="sm"
                      />
                      {/* Two lines rather than an ellipsis: "Baggin' & Braggin'"
                          and "Baggin Rights" both read "Baggin…" cut short. */}
                      <span className="line-clamp-2 flex-1 break-words text-xs font-medium">
                        {team.name}
                      </span>
                      <div
                        className={`size-4 shrink-0 rounded-sm border flex items-center justify-center ${
                          isSelected
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-primary'
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedTeamIds.length > 0 && (
            <div className="text-sm text-primary dark:!text-blue-200">
              {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}

      {/* Double Header Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-2.5 shadow-sm">
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

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <label className="block text-sm font-medium">
            {isDoubleHeader ? 'Select Two Timeslots' : 'Select a block'}
          </label>
          {isDoubleHeader && (
            <Badge variant="doubleHeader" className="text-xs">
              {selectedTimeslots.length}/2 selected
            </Badge>
          )}
        </div>
        {!isDoubleHeader && (
          <p className="text-xs text-muted-foreground">
            A block is two back-to-back times. Picking one books both.
          </p>
        )}
        {isDoubleHeader ? (
          // Double header mode - multiple selection
          <div className="flex flex-wrap justify-start gap-1.5">
            {DOUBLE_HEADER_START_TIMES.map((time) => {
              const isSelected = selectedTimeslots.includes(time);
              return (
                <Button
                  key={time}
                  type="button"
                  variant="outline"
                  onClick={() => handleTimeslotToggle(time)}
                  className={`
                      px-3 py-1.5 transition-colors
                      ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent hover:from-amber-400 hover:to-orange-400'
                          : 'border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy/10 dark:!border-blue-200 dark:!text-blue-200 dark:hover:bg-blue-200/10'
                      }
                    `}
                >
                  {time}
                </Button>
              );
            })}
          </div>
        ) : (
          // Single timeslot mode
          <ToggleGroup
            type="single"
            value={selectedTimeslot}
            onValueChange={setSelectedTimeslot}
            className="flex flex-wrap justify-start gap-1.5"
          >
            {BLOCK_CHOICES.map((choice) => (
              <ToggleGroupItem
                key={choice.value}
                value={choice.value}
                title={choice.description}
                className={`
                  px-3 py-1.5 transition-colors
                  ${
                    choice.value === 'BYE'
                      ? selectedTimeslot === choice.value
                        ? 'bg-orange-600 text-white'
                        : 'border-orange-600 text-orange-600 hover:bg-orange-50 dark:!border-orange-200 dark:!text-orange-200 dark:hover:bg-orange-200/10'
                      : selectedTimeslot === choice.value
                        ? 'bg-cornhole-navy text-white'
                        : 'border-cornhole-navy text-cornhole-navy dark:!border-blue-200 dark:!text-blue-200'
                  }
                `}
              >
                {choice.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <Button
        type="submit"
        className={`w-full disabled:!opacity-100 disabled:!bg-muted disabled:!text-muted-foreground ${isDoubleHeader ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'bg-cornhole-navy hover:bg-cornhole-navy/90'}`}
        disabled={
          (isDoubleHeader &&
            (selectedTimeslots.length !== 2 ||
              (batchMode && selectedTeamIds.length === 0) ||
              (!batchMode && !teamId))) ||
          (!isDoubleHeader &&
            ((batchMode && (!selectedTimeslot || selectedTeamIds.length === 0)) ||
              (!batchMode && (!teamId || !selectedTimeslot)))) ||
          availableTeams.length === 0 ||
          isSubmitting
        }
      >
        {isSubmitting
          ? 'Booking…'
          : isDoubleHeader
            ? `Confirm Double Header (${selectedTeamIds.length} Team${selectedTeamIds.length !== 1 ? 's' : ''})`
            : batchMode
              ? `Confirm Assignment (${selectedTeamIds.length} Team${selectedTeamIds.length !== 1 ? 's' : ''})`
              : 'Confirm Assignment'}
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
