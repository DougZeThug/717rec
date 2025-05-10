
import { Team } from "./index";

export interface TeamTimeslot {
  id: string;
  match_date: string;
  timeslot: string;
  team_id: string;
  created_at: string;
  teams?: {
    id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
    divisionName?: string | null;
  };
}

export interface TimeslotGroup {
  [timeslot: string]: TeamTimeslot[];
}

export interface TimeslotOperationResult {
  success: boolean;
  data?: TeamTimeslot | TeamTimeslot[];
  error?: string;
}

export interface TimeslotFilterOptions {
  date?: Date;
  teamId?: string;
  timeslot?: string;
}
