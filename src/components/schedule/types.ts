
import { Team, Match } from "@/types";

export interface MatchFormProps {
  match?: Match;
  teams: Team[];
  onSubmit: (match: Omit<Match, "id">) => void;
  onCancel: () => void;
}

export interface TeamSelectorProps {
  teamId: string;
  setTeamId: (value: string) => void;
  otherTeamId: string;
  teams: Team[];
  label: string;
  placeholder: string;
}

export interface ScoreSectionProps {
  isCompleted: boolean;
  team1Id: string;
  team2Id: string;
  team1Score: number | undefined;
  team2Score: number | undefined;
  setTeam1Score: (value: number | undefined) => void;
  setTeam2Score: (value: number | undefined) => void;
  teams: Team[];
}

export interface DateTimeSelectionProps {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedTimeSlot: string | null;
  setSelectedTimeSlot: (timeSlot: string) => void;
  timeSlots: string[];
}
