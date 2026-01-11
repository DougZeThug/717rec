import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Team } from '@/types';
import { TeamTimeslot } from '@/types';

interface TimeslotAssignmentProps {
  selectedDate: Date;
  teams: Team[];
  existingTimeslots: TeamTimeslot[];
  onAssign: (teamId: string, timeslot: string) => void;
  onBatchAssign?: (teamIds: string[], timeslot: string) => void;
}

const TimeslotAssignment: React.FC<TimeslotAssignmentProps> = ({
  selectedDate,
  teams,
  existingTimeslots,
  onAssign,
  onBatchAssign,
}) => {
  const [teamId, setTeamId] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState<string>('');
  const [batchMode, setBatchMode] = useState<boolean>(true); // Default to true for batch mode

  // Updated time slots to include BYE and all consecutive 30-minute slots
  const timeSlots = [
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

  // Filter out teams that already have a timeslot for this date
  const assignedTeamIds = existingTimeslots.map((ts) => ts.team_id);
  const availableTeams = teams.filter((team) => !assignedTeamIds.includes(team.id));

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

    // Keep the selected timeslot for convenience when making multiple assignments
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Select Teams</label>
            <Button type="button" variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedTeamIds.length === availableTeams.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <ScrollArea className="h-[200px] border rounded-md p-2">
            {availableTeams.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                All teams have been assigned for this date
              </div>
            ) : (
              <div className="space-y-2">
                {availableTeams.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => handleToggleTeam(team.id)}
                    />
                    <label
                      htmlFor={`team-${team.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {team.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedTeamIds.length > 0 && (
            <div className="text-sm text-blue-600">
              {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium">Select Timeslot</label>
        <ToggleGroup
          type="single"
          value={selectedTimeslot}
          onValueChange={setSelectedTimeslot}
          className="flex flex-wrap justify-start gap-2"
        >
          {timeSlots.map((time) => (
            <ToggleGroupItem
              key={time}
              value={time}
              className={`
                px-4 py-2 transition-colors
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
      </div>

      <Button
        type="submit"
        className="w-full bg-cornhole-navy hover:bg-cornhole-navy/90"
        disabled={
          (batchMode && (!selectedTimeslot || selectedTeamIds.length === 0)) ||
          (!batchMode && (!teamId || !selectedTimeslot)) ||
          availableTeams.length === 0
        }
      >
        {batchMode ? `Assign Timeslot to ${selectedTeamIds.length} Team(s)` : 'Assign Timeslot'}
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
