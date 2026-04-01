import React, { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Team } from '@/types';
import { TeamTimeslot } from '@/types';

// Static list of available timeslots — defined outside component to avoid re-creation on every render
const TIME_SLOTS = [
  'BYE',
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
];

interface TimeslotAssignmentProps {
  selectedDate: Date;
  teams: Team[];
  existingTimeslots: TeamTimeslot[];
  onAssign: (teamId: string, timeslot: string) => void;
  onBatchAssign?: (teamIds: string[], timeslot: string) => void;
  onBatchAssignDoubleHeaders?: (teamIds: string[], slot1: string, slot2: string) => void;
}

const TimeslotAssignment: React.FC<TimeslotAssignmentProps> = ({
  selectedDate: _selectedDate,
  teams,
  existingTimeslots,
  onAssign,
  onBatchAssign,
  onBatchAssignDoubleHeaders,
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
      {/* Hide the mode toggle buttons - they are commented out but kept for later cleanup */}
      {/*
      <div className="flex items-center gap-2 mb-4">
        <Button
          type="button"
          variant={batchMode ? "default" : "outline"}
          onClick={() => {
            setBatchMode(false);
            setSelectedTeamIds([]);
          }}
          className="flex-1"
        >
          Single Team
        </Button>
        <Button
          type="button"
          variant={batchMode ? "outline" : "default"}
          onClick={() => {
            setBatchMode(true);
            setTeamId("");
          }}
          className="flex-1"
        >
          Multiple Teams
        </Button>
      </div>
      */}

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
            <label className="block text-sm font-medium">Team Selection Grid</label>
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
              <div className="grid grid-cols-2 gap-2">
                {availableTeams.map((team) => {
                  const isSelected = selectedTeamIds.includes(team.id);
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleToggleTeam(team.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      <TeamLogo
                        imageUrl={team.imageUrl || team.logoUrl}
                        teamName={team.name}
                        size="sm"
                      />
                      <span className="text-xs font-medium truncate flex-1">{team.name}</span>
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {selectedTeamIds.length > 0 && (
            <div className="text-sm text-primary">
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
            {isDoubleHeader ? 'Select Two Timeslots' : 'Select Timeslot'}
          </label>
          {isDoubleHeader && (
            <Badge variant="doubleHeader" className="text-xs">
              {selectedTimeslots.length}/2 selected
            </Badge>
          )}
        </div>
        {isDoubleHeader ? (
          // Double header mode - multiple selection
          <div className="flex flex-wrap justify-start gap-1.5">
            {TIME_SLOTS.filter((time) => time !== 'BYE').map((time) => {
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
                          : 'border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy/10'
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
            {TIME_SLOTS.map((time) => (
              <ToggleGroupItem
                key={time}
                value={time}
                className={`
                  px-3 py-1.5 transition-colors
                  ${
                    time === 'BYE'
                      ? selectedTimeslot === time
                        ? 'bg-orange-600 text-white'
                        : 'border-orange-600 text-orange-600 hover:bg-orange-50'
                      : selectedTimeslot === time
                        ? 'bg-cornhole-navy text-white'
                        : 'border-cornhole-navy text-cornhole-navy'
                  }
                `}
              >
                {time === 'BYE' ? 'BYE WEEK' : time}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <Button
        type="submit"
        className={`w-full ${isDoubleHeader ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400' : 'bg-cornhole-navy hover:bg-cornhole-navy/90'}`}
        disabled={
          (isDoubleHeader &&
            (selectedTimeslots.length !== 2 ||
              (batchMode && selectedTeamIds.length === 0) ||
              (!batchMode && !teamId))) ||
          (!isDoubleHeader &&
            ((batchMode && (!selectedTimeslot || selectedTeamIds.length === 0)) ||
              (!batchMode && (!teamId || !selectedTimeslot)))) ||
          availableTeams.length === 0
        }
      >
        {isDoubleHeader
          ? `Confirm Double Header (${selectedTeamIds.length} Team${selectedTeamIds.length !== 1 ? 's' : ''})`
          : batchMode
            ? `Confirm Assignment (${selectedTeamIds.length} Team${selectedTeamIds.length !== 1 ? 's' : ''})`
            : 'Confirm Assignment'}
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
