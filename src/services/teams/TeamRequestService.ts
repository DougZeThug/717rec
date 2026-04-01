import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import type { TeamRequest, TeamRequestStatus, TeamRequestWithTeam } from '@/types/teamRequest';

// ─── fetchPendingRequestsCount ────────────────────────────────────────────────

export const fetchPendingRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('team_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  if (error) handleDatabaseError(error, 'Failed to fetch pending requests count');
  return count || 0;
};

// ─── fetchTeamRequests ────────────────────────────────────────────────────────

export const fetchTeamRequests = async (teamId: string): Promise<TeamRequest[]> => {
  const { data, error } = await supabase
    .from('team_requests')
    .select(
      'id, team_id, season_id, request_type, status, match_date, current_timeslot, requested_timeslot, reason, admin_notes, submitted_by, submitted_by_name, processed_by, processed_at, created_at, updated_at'
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) handleDatabaseError(error, 'Failed to fetch team requests');
  return data as TeamRequest[];
};

// ─── fetchAllRequests ─────────────────────────────────────────────────────────

export const fetchAllRequests = async (
  statusFilter?: TeamRequestStatus
): Promise<TeamRequestWithTeam[]> => {
  let query = supabase
    .from('team_requests')
    .select(
      `
      *,
      teams:team_id (name)
    `
    )
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) handleDatabaseError(error, 'Failed to fetch all requests');
  return data as TeamRequestWithTeam[];
};

// ─── submitTeamRequest ────────────────────────────────────────────────────────

export const submitTeamRequest = async (request: {
  team_id: string;
  request_type: string;
  match_date?: string;
  current_timeslot?: string;
  requested_timeslot?: string;
  reason?: string;
  submitted_by_name?: string;
}) => {
  // Get current user and season in parallel
  const [
    {
      data: { user },
    },
    { data: season },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('seasons').select('id').eq('is_active', true).single(),
  ]);

  const { data, error } = await supabase
    .from('team_requests')
    .insert({
      ...request,
      season_id: season?.id,
      submitted_by: user?.id ?? null,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) handleDatabaseError(error, 'Failed to submit team request');
  return data;
};

// ─── updateTeamRequestStatus ──────────────────────────────────────────────────

export const updateTeamRequestStatus = async ({
  id,
  status,
  admin_notes,
  processed_by,
}: {
  id: string;
  status: TeamRequestStatus;
  admin_notes?: string;
  processed_by?: string;
}) => {
  const { data, error } = await supabase
    .from('team_requests')
    .update({
      status,
      admin_notes,
      processed_by,
      processed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) handleDatabaseError(error, 'Failed to update team request status');
  return data;
};
