import React from "react";
import { Button } from "@/components/ui/button";
import { MatchFormProps, MatchFormValues } from "./types";
import { createDateWithTime } from "./form-utils";
import TeamSelector from "./TeamSelector";
import ScoreSection from "./ScoreSection";
import DateTimeSelection from "./DateTimeSelection";
import MatchStatusToggle from "./MatchStatusToggle";
import { useForm } from "react-hook-form";

const MatchFormRHF: React.FC<MatchFormProps> = ({ 
  match, 
  teams, 
  onSubmit, 
  onCancel,
  form 
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = form || useForm<MatchFormValues>({
    defaultValues: {
      team1Id: match?.team1Id || "",
      team2Id: match?.team2Id || "",
      date: match ? new Date(match.date) : new Date(),
      timeSlot: match?.timeSlot || null,
      isCompleted: match?.iscompleted || false,
      team1Score: match?.team1Score,
      team2Score: match?.team2Score,
    },
  });

  const timeSlots = ["6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM"];

  const handleTeam1Change = (value: string) => {
    setValue("team1Id", value);
  };

  const handleTeam2Change = (value: string) => {
    setValue("team2Id", value);
  };

  const handleDateChange = (date: Date) => {
    setValue("date", date);
  };

  const handleTimeSlotChange = (timeSlot: string | null) => {
    setValue("timeSlot", timeSlot);
  };

  const handleIsCompletedChange = (value: boolean) => {
    setValue("isCompleted", value);
  };

  const handleTeam1ScoreChange = (value: number | undefined) => {
    setValue("team1Score", value);
  };

  const handleTeam2ScoreChange = (value: number | undefined) => {
    setValue("team2Score", value);
  };

  const handleSubmit = (values: MatchFormValues) => {
    // Create date with selected time
    const dateWithTime = createDateWithTime(values.date, values.timeSlot);
    
    // Determine winner and loser if match is completed
    let winner_id: string | undefined;
    let loser_id: string | undefined;
    
    if (values.isCompleted && values.team1Score !== undefined && values.team2Score !== undefined) {
      if (values.team1Score > values.team2Score) {
        winner_id = values.team1Id;
        loser_id = values.team2Id;
      } else if (values.team2Score > values.team1Score) {
        winner_id = values.team2Id;
        loser_id = values.team1Id;
      }
    }
    
    onSubmit({
      team1Id: values.team1Id,
      team2Id: values.team2Id,
      date: dateWithTime.toISOString(),
      location: "", // Setting to empty string for legacy compatibility
      iscompleted: values.isCompleted,
      team1Score: values.isCompleted ? values.team1Score : undefined,
      team2Score: values.isCompleted ? values.team2Score : undefined,
      winner_id,
      loser_id
    });
  };

  return (
    <form onSubmit={handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamSelector
          teamId={form ? form.watch("team1Id") : match?.team1Id || ""}
          setTeamId={handleTeam1Change}
          otherTeamId={form ? form.watch("team2Id") : match?.team2Id || ""}
          teams={teams}
          label="Team 1"
          placeholder="Select Team 1"
        />
        
        <TeamSelector
          teamId={form ? form.watch("team2Id") : match?.team2Id || ""}
          setTeamId={handleTeam2Change}
          otherTeamId={form ? form.watch("team1Id") : match?.team1Id || ""}
          teams={teams}
          label="Team 2"
          placeholder="Select Team 2"
        />
      </div>
      
      <DateTimeSelection
        selectedDate={form ? form.watch("date") : new Date()}
        setSelectedDate={handleDateChange}
        selectedTimeSlot={form ? form.watch("timeSlot") : null}
        setSelectedTimeSlot={handleTimeSlotChange}
        timeSlots={timeSlots}
      />
      
      <MatchStatusToggle
        isCompleted={form ? form.watch("isCompleted") : false}
        setIsCompleted={handleIsCompletedChange}
      />
      
      <ScoreSection
        isCompleted={form ? form.watch("isCompleted") : false}
        team1Id={form ? form.watch("team1Id") : match?.team1Id || ""}
        team2Id={form ? form.watch("team2Id") : match?.team2Id || ""}
        team1Score={form ? form.watch("team1Score") : match?.team1Score}
        team2Score={form ? form.watch("team2Score") : match?.team2Score}
        setTeam1Score={handleTeam1ScoreChange}
        setTeam2Score={handleTeam2ScoreChange}
        teams={teams}
      />
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-cornhole-navy hover:bg-cornhole-navy/90">
          {match ? "Update Match" : "Create Match"}
        </Button>
      </div>
    </form>
  );
};

export default MatchFormRHF;
