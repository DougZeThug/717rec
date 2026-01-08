export type TeamRequestType = 'TIME_CHANGE' | 'BYE_REQUEST' | 'EMERGENCY_CANCEL';
export type TeamRequestStatus = 'PENDING' | 'APPROVED' | 'DENIED';

export interface TeamRequest {
  id: string;
  team_id: string;
  season_id: string | null;
  request_type: TeamRequestType;
  status: TeamRequestStatus;
  match_date: string | null;
  current_timeslot: string | null;
  requested_timeslot: string | null;
  reason: string | null;
  admin_notes: string | null;
  submitted_by: string | null;
  submitted_by_name: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamRequestWithTeam extends TeamRequest {
  teams?: {
    name: string;
  };
}

export const REQUEST_TYPE_LABELS: Record<TeamRequestType, string> = {
  TIME_CHANGE: 'Time Change',
  BYE_REQUEST: 'Bye Request',
  EMERGENCY_CANCEL: 'Emergency Cancellation',
};

export const REQUEST_STATUS_LABELS: Record<TeamRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  DENIED: 'Denied',
};
