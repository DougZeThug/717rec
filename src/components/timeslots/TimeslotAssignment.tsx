
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Team } from "@/types";
import { TeamTimeslot } from "@/types";

interface TimeslotAssignmentProps {
  selectedDate: Date;
  teams: Team[];
  existingTimeslots: TeamTimeslot[];
  onAssign: (teamId: string, timeslot: string) => void;
}

const TimeslotAssignment: React.FC<TimeslotAssignmentProps> = ({ 
  selectedDate, 
  teams,
  existingTimeslots,
  onAssign
}) => {
  const [teamId, setTeamId] = useState<string>("");
  const [selectedTimeslot, setSelectedTimeslot] = useState<string>("");
  
  const timeSlots = ["6:30 PM", "7:30 PM", "8:30 PM"];
  
  // Filter out teams that already have a timeslot for this date
  const availableTeams = teams.filter(team => 
    !existingTimeslots.some(ts => ts.team_id === team.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !selectedTimeslot) {
      return;
    }
    
    onAssign(teamId, selectedTimeslot);
    
    // Reset form
    setTeamId("");
    setSelectedTimeslot("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="teamSelect" className="block text-sm font-medium">
          Select Team
        </label>
        <Select 
          value={teamId} 
          onValueChange={setTeamId}
        >
          <SelectTrigger id="teamSelect" className="w-full">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {availableTeams.length === 0 ? (
              <SelectItem value="none" disabled>
                All teams have been assigned for this date
              </SelectItem>
            ) : (
              availableTeams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
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
        disabled={!teamId || !selectedTimeslot || availableTeams.length === 0}
      >
        Assign Timeslot
      </Button>
    </form>
  );
};

export default TimeslotAssignment;
