import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Team } from "@/types";
import { TeamTimeslot } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeslotAssignmentProps {
  selectedDate: Date;
  teams: Team[];
  existingTimeslots: TeamTimeslot[];
  onBatchAssign: (teamIds: string[], timeslot: string) => void;
}

const TimeslotAssignment: React.FC<TimeslotAssignmentProps> = ({ 
  selectedDate, 
  teams,
  existingTimeslots,
  onBatchAssign
}) => {
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTimeslot, setSelectedTimeslot] = useState<string>("");
  
  // Updated time slots to include 6:00 PM and all consecutive 30-minute slots
  const timeSlots = ["6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"];
  
  // Filter out teams that already have a timeslot for this date
  const assignedTeamIds = existingTimeslots.map(ts => ts.team_id);
  const availableTeams = teams.filter(team => 
    !assignedTeamIds.includes(team.id)
  );

  const handleToggleTeam = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId) 
        : [...prev, teamId]
    );
  };

  const handleSelectAll = () => {
    if (selectedTeamIds.length === availableTeams.length) {
      setSelectedTeamIds([]);
    } else {
      setSelectedTeamIds(availableTeams.map(team => team.id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTimeslot || selectedTeamIds.length === 0) {
      return;
    }
    
    onBatchAssign(selectedTeamIds, selectedTimeslot);
    setSelectedTeamIds([]);
    
    // Keep the selected timeslot for convenience when making multiple assignments
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">
            Select Teams
          </label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
          >
            {selectedTeamIds.length === availableTeams.length ? "Deselect All" : "Select All"}
          </Button>
        </div>
        
        <ScrollArea className="h-[200px] border rounded-md p-2">
          {availableTeams.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              All teams have been assigned for this date
            </div>
          ) : (
            <div className="space-y-2">
              {availableTeams.map(team => (
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
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Select Timeslot
        </label>
        <ToggleGroup 
          type="single" 
          value={selectedTimeslot}
          onValueChange={setSelectedTimeslot}
          className="flex flex-wrap justify-start gap-2"
        >
          {timeSlots.map(time => (
            <ToggleGroupItem 
              key={time} 
              value={time} 
              className={`
                px-4 py-2 transition-colors
                ${selectedTimeslot === time ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
              `}
            >
              {time}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-cornhole-navy hover:bg-cornhole-navy/90" 
        disabled={!selectedTimeslot || selectedTeamIds.length === 0 || availableTeams.length === 0}
      >
        Assign Timeslot to {selectedTeamIds.length} Team{selectedTeamIds.length !== 1 ? 's' : ''}
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
