import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

import { TeamMembershipForAdmin, TeamMembershipRecord } from './teamFetch.types';

// ─── fetchTeamMembership ──────────────────────────────────────────────────────

/**
 * Fetch the current team membership record for a user.
 * Returns null if the user is not in any team.
 */
export const fetchTeamMembership = async (userId: string): Promise<TeamMembershipRecord | null> => {
  const { data, error: fetchError } = await supabase
    .from('team_memberships')
    .select(
      `
      id,
      user_id,
      team_id,
      joined_at,
      is_approved,
      approved_by,
      approved_at,
      team:teams(id, name, logo_url, image_url, division_id, wins, losses, game_wins, game_losses)
    `
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) handleDatabaseError(fetchError, 'Failed to fetch team membership');

  if (!data) return null;

  // Transform the data to match the Team interface
  return {
    ...data,
    team: data.team
      ? {
          ...data.team,
          logoUrl: data.team.image_url || data.team.logo_url,
          imageUrl: data.team.image_url || data.team.logo_url,
          power_score: 0, // Default values for required properties
          sos: 0,
          win_percentage: 0,
          game_win_percentage: 0,
        }
      : undefined,
  } as TeamMembershipRecord;
};

// ─── joinTeamMembership ───────────────────────────────────────────────────────

/**
 * Join a team (or switch teams). If hasMembership is true, updates existing record.
 * If false, inserts a new record. Both cases set is_approved to false (pending admin).
 */
export const joinTeamMembership = async (
  userId: string,
  teamId: string,
  hasMembership: boolean
): Promise<void> => {
  if (hasMembership) {
    const { error } = await supabase
      .from('team_memberships')
      .update({
        team_id: teamId,
        is_approved: false,
        approved_by: null,
        approved_at: null,
      })
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to update team membership');
  } else {
    const { error } = await supabase.from('team_memberships').insert({
      user_id: userId,
      team_id: teamId,
      is_approved: false,
    });

    if (error) handleDatabaseError(error, 'Failed to insert team membership');
  }
};

// ─── leaveTeamMembership ──────────────────────────────────────────────────────

export const leaveTeamMembership = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('team_memberships').delete().eq('user_id', userId);

  if (error) handleDatabaseError(error, 'Failed to leave team membership');
};

// ─── fetchPendingMembershipCount ──────────────────────────────────────────────

export const fetchPendingMembershipCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('team_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('is_approved', false);

  if (error) handleDatabaseError(error, 'Failed to fetch pending membership count');
  return count ?? 0;
};

// ─── fetchPendingMembershipsForAdmin ──────────────────────────────────────────

/**
 * Fetch all pending team membership requests with user and team data.
 * Returns only requests where both user and team data are found.
 */
export const fetchPendingMembershipsForAdmin = async (): Promise<TeamMembershipForAdmin[]> => {
  // First, get all pending memberships
  const { data: memberships, error: membershipsError } = await supabase
    .from('team_memberships')
    .select('id, user_id, team_id, joined_at, is_approved')
    .eq('is_approved', false)
    .order('joined_at', { ascending: false });

  if (membershipsError) handleDatabaseError(membershipsError, 'Failed to fetch pending memberships');
  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Get unique user IDs and team IDs
  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const teamIds = [...new Set(memberships.map((m) => m.team_id))];

  // Fetch profiles and teams in parallel
  const [profilesResult, teamsResult] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
    supabase.from('teams').select('id, name, logo_url, image_url').in('id', teamIds),
  ]);

  if (profilesResult.error) handleDatabaseError(profilesResult.error, 'Failed to fetch member profiles');
  if (teamsResult.error) handleDatabaseError(teamsResult.error, 'Failed to fetch member teams');

  // Create lookup maps
  const profilesMap = new Map((profilesResult.data || []).map((p) => [p.id, p]));
  const teamsMap = new Map((teamsResult.data || []).map((t) => [t.id, t]));

  // Combine the data
  return memberships
    .map((membership) => {
      const user = profilesMap.get(membership.user_id);
      const team = teamsMap.get(membership.team_id);

      // Skip if user or team data is missing
      if (!user || !team) return null;

      return {
        ...membership,
        user,
        team,
      };
    })
    .filter((item): item is TeamMembershipForAdmin => item !== null);
};

// ─── updateMembershipApproval ─────────────────────────────────────────────────

export const updateMembershipApproval = async (
  membershipId: string,
  approved: boolean
): Promise<void> => {
  const updateData: Record<string, unknown> = {
    is_approved: approved,
  };

  if (approved) {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
  }

  const { error } = await supabase
    .from('team_memberships')
    .update(updateData)
    .eq('id', membershipId);

  if (error) handleDatabaseError(error, 'Failed to update membership approval');
};
