
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Match } from "@/types";
import { MatchFormProps } from "./types";
import { createDateWithTime, getTimeSlotFromDate, determineMatchOutcome } from "./form-utils";
import TeamSelector from "./TeamSelector";
import ScoreSection from "./ScoreSection";
import DateTimeSelection from "./DateTimeSelection";
import MatchStatusToggle from "./MatchStatusToggle";

const MatchForm: React.FC<MatchFormProps> = ({ match, teams, onSubmit, onCancel }) => {
  const [team1Id, setTeam1Id] = useState(match?.team1Id || "");
  const [team2Id, setTeam2Id] = useState(match?.team2Id || "");
  const [selectedDate, setSelectedDate] = useState(match ? new Date(match.date) : new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(match?.iscompleted || false);
  const [team1Score, setTeam1Score] = useState<number | undefined>(match?.team1Score);
  const [team2Score, setTeam2Score] = useState<number | undefined>(match?.team2Score);

  // Set up time slots with consistent formatting
  const timeSlots = ["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];

  useEffect(() => {
    // If editing an existing match, set the appropriate time slot
    if (match) {
      const matchDate = new Date(match.date);
      const timeSlot = getTimeSlotFromDate(matchDate);
      if (timeSlot) {
        setSelectedTimeSlot(timeSlot);
      }
    }
  }, [match]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create date with selected time
    const dateWithTime = createDateWithTime(selectedDate, selectedTimeSlot);
    
    // Determine winner and loser
    const { winnerId, loserId } = determineMatchOutcome(
      isCompleted,
      team1Id,
      team2Id,
      team1Score,
      team2Score
    );
    
    onSubmit({
      team1Id,
      team2Id,
      date: dateWithTime.toISOString(),
      location: "", // Setting to empty string for legacy compatibility
      iscompleted: isCompleted,
      team1Score: isCompleted ? team1Score : undefined,
      team2Score: isCompleted ? team2Score : undefined,
      winnerId,
      loserId
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamSelector 
          teamId={team1Id}
          setTeamId={setTeam1Id}
          otherTeamId={team2Id}
          teams={teams}
          label="Team 1"
          placeholder="Select Team 1"
        />
        
        <TeamSelector 
          teamId={team2Id}
          setTeamId={setTeam2Id}
          otherTeamId={team1Id}
          teams={teams}
          label="Team 2"
          placeholder="Select Team 2"
        />
      </div>
      
      <DateTimeSelection
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedTimeSlot={selectedTimeSlot || ""}
        setSelectedTimeSlot={setSelectedTimeSlot as (value: string) => void}
        timeSlots={timeSlots}
      />
      
      <MatchStatusToggle 
        isCompleted={isCompleted}
        setIsCompleted={setIsCompleted}
      />
      
      <ScoreSection
        isCompleted={isCompleted}
        team1Id={team1Id}
        team2Id={team2Id}
        team1Score={team1Score}
        team2Score={team2Score}
        setTeam1Score={setTeam1Score}
        setTeam2Score={setTeam2Score}
        teams={teams}
      />
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-cornhole-navy hover:bg-cornhole-navy/90" disabled={!selectedTimeSlot}>
          {match ? "Update Match" : "Create Match"}
        </Button>
      </div>
    </form>
  );
};

export default MatchForm;
