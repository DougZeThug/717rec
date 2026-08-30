import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
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
      rejected_at,
      rejected_by,
      team:teams(id, name, logo_url, image_url, division_id, wins, losses, game_wins, game_losses)
    `
    )
    .eq('user_id', userId)
    // One row per user is the rule, but a stale or failed read used to let the
    // join form insert a second one. Order and limit so a stray duplicate picks
    // a row instead of making maybeSingle() throw, which locked the account out
    // of every member ability with no way back. Approved row wins, then oldest.
    .order('is_approved', { ascending: false })
    .order('joined_at', { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) handleDatabaseError(fetchError, 'Failed to fetch team membership');

  // Returns null when no data exists yet (not an error) — caller renders an empty state.
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
    // idx_one_membership_per_user is total, so a refused row occupies this
    // person's only slot: asking again has to reuse it, not insert beside it.
    // Clearing rejected_at is what turns it back into a pending request, and
    // joined_at is restamped so the admin sees when they asked, not when they
    // first asked months ago.
    const { error } = await supabase
      .from('team_memberships')
      .update({
        team_id: teamId,
        is_approved: false,
        approved_by: null,
        approved_at: null,
        rejected_at: null,
        rejected_by: null,
        joined_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) handleDatabaseError(error, 'Failed to update team membership');
  } else {
    const { error } = await supabase.from('team_memberships').insert({
      user_id: userId,
      team_id: teamId,
      is_approved: false,
    });

    // idx_one_membership_per_user: one row per user. This fires when the join
    // form was drawn against a stale or failed membership read, so the row it
    // thought was missing already exists. That insert used to succeed and take
    // away every member ability, so say what happened instead of retrying.
    if (error?.code === '23505') {
      throw new BusinessLogicError('You already have a team request. Refresh the page to see it.');
    }
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
    .eq('is_approved', false)
    // A refused row is also is_approved = false. Without this it would sit in
    // the badge count for good.
    .is('rejected_at', null);

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
    // As above: refused rows keep is_approved = false, so exclude them or the
    // queue never empties.
    .is('rejected_at', null)
    .order('joined_at', { ascending: false });

  if (membershipsError)
    handleDatabaseError(membershipsError, 'Failed to fetch pending memberships');
  if (!memberships || memberships.length === 0) {
    return [];
  }

  // Get unique user IDs and team IDs
  const userIds = [...new Set(memberships.map((m) => m.user_id))].filter(
    (id): id is string => id !== null
  );
  const teamIds = [...new Set(memberships.map((m) => m.team_id))].filter(
    (id): id is string => id !== null
  );

  // Fetch profiles and teams in parallel
  const [profilesResult, teamsResult] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', userIds),
    supabase.from('teams').select('id, name, logo_url, image_url').in('id', teamIds),
  ]);

  if (profilesResult.error)
    handleDatabaseError(profilesResult.error, 'Failed to fetch member profiles');
  if (teamsResult.error) handleDatabaseError(teamsResult.error, 'Failed to fetch member teams');

  // Create lookup maps
  const profilesMap = new Map((profilesResult.data || []).map((p) => [p.id, p]));
  const teamsMap = new Map((teamsResult.data || []).map((t) => [t.id, t]));

  // Combine the data
  return memberships
    .map((membership) => {
      const user = profilesMap.get(membership.user_id ?? '');
      const team = teamsMap.get(membership.team_id ?? '');

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
  // Refusing a request stamps rejected_at rather than deleting the row, so the
  // person can be shown that they were refused. is_approved alone could not say
  // it: false already means "pending", so the row had to go to leave the queue.
  // The queue reads now exclude rejected_at, which is what keeps it clear.
  if (!approved) {
    const { data, error } = await supabase
      .from('team_memberships')
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .eq('id', membershipId)
      .select('id');

    if (error) handleDatabaseError(error, 'Failed to reject membership');
    if (!data || data.length === 0) {
      throw new BusinessLogicError(
        'Failed to reject membership: no row was changed. You may not have permission.'
      );
    }
    return;
  }

  const updateData: { is_approved: boolean; approved_at?: string; approved_by?: string } = {
    is_approved: approved,
  };

  updateData.approved_at = new Date().toISOString();
  updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;

  const { data, error } = await supabase
    .from('team_memberships')
    .update(updateData)
    .eq('id', membershipId)
    .select('id');

  if (error) {
    // idx_one_membership_per_user: one membership row per user, approved or not.
    if (error.code === '23505') {
      throw new BusinessLogicError(
        'This user already has a membership on another team. Remove that membership first.'
      );
    }
    handleDatabaseError(error, 'Failed to update membership approval');
  }
  if (!data || data.length === 0) {
    throw new BusinessLogicError(
      'Failed to update membership approval: no row was changed. You may not have permission.'
    );
  }
};
