export interface TeamTimeslot {
  id: string;
  match_date: string;
  timeslot: string;
  team_id: string;
  created_at: string;
  is_back_to_back: boolean;
  is_double_header: boolean;
  pair_slot: string | null;
  match_sequence: number | null;
  teams?: {
    id: string;
    name: string;
    logo_url?: string | null;
    image_url?: string | null;
    divisionName: string | null;
  };
}

export interface TimeslotGroup {
  [timeslot: string]: TeamTimeslot[];
}

// New interface for back-to-back pair grouping
export interface BackToBackTimeslotGroup {
  [pairName: string]: {
    primary: TeamTimeslot[];
    secondary: TeamTimeslot[];
    pairLabel: string;
  };
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
  isBackToBack?: boolean;
  pairSlot?: string;
}

// New interface for back-to-back assignment operations
export interface BackToBackAssignmentOptions {
  teamIds: string[];
  pairName: 'Early' | 'Mid' | 'Late';
  date: Date;
}
