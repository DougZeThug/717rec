import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { Team } from '@/types';
import { BadgeType, TeamBadgeEvent } from '@/types/badges';
import type {
  TeamRequest,
  TeamRequestStatus,
  TeamRequestWithTeam,
} from '@/types/teamRequest';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog, teamLog } from '@/utils/logger';
import { transformTeamRow, TeamRowData } from '@/utils/teamTransformer';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TeamAnalysis {
  id: string;
  team_id: string;
  overall: string | null;
  strengths: string[];
  weaknesses: string[];
  trends: string | null;
  rivalry_insights: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamAnalysisInput {
  overall?: string;
  strengths?: string[];
  weaknesses?: string[];
  trends?: string;
  rivalry_insights?: string;
}

export interface TeamsQueryOptions {
  divisionId?: string | null;
  includeHidden?: boolean;
  /** When false, the query will not execute. Useful for lazy loading. */
  enabled?: boolean;
}

export interface TeamMembershipRecord {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  approved_by?: string;
  approved_at?: string;
  team?: Team;
}

export interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface TeamMembershipForAdmin {
  id: string;
  user_id: string;
  team_id: string;
  joined_at: string;
  is_approved: boolean;
  user: UserProfile;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
    image_url: string | null;
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

interface RawBadgeData {
  id: string;
  team_id: string;
  badge_type: string;
  season_id: string | null;
  awarded_at: string;
  metadata: Json;
  is_active: boolean;
  created_at: string;
}

function transformBadge(badge: RawBadgeData): TeamBadgeEvent {
  return {
    id: badge.id,
    team_id: badge.team_id,
    badge_type: badge.badge_type as BadgeType,
    season_id: badge.season_id,
    awarded_at: badge.awarded_at,
    metadata: badge.metadata || {},
    is_active: badge.is_active,
    created_at: badge.created_at,
  };
}

// ─── fetchTeamsFromApi (original) ────────────────────────────────────────────

/**
 * Fetch all teams from the database
 * @throws {DatabaseError} When database operations fail
 */
export const fetchTeamsFromApi = async () => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      `
      team_id,
      name,
      logo_url,
      image_url,
      players,
      wins,
      losses,
      game_wins,
      game_losses,
      created_at,
      division_id,
      divisionname,
      sos,
      power_score,
      win_percentage,
      game_win_percentage,
      close_match_losses
    `
    )
    .order('name');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch teams');
  }

  // Transform data using the centralized teamTransformer utility
  // The power_score and sos are calculated correctly in the database using the 40/45/15 formula
  return (data || []).map((team) => transformTeamRow(team as TeamRowData));
};

// ─── fetchTeamsWithOptions ────────────────────────────────────────────────────

/**
 * Fetch teams with optional filtering by division.
 * Deduplicates by team_id and filters hidden teams unless explicitly included.
 */
export const fetchTeamsWithOptions = async (options?: TeamsQueryOptions): Promise<Team[]> => {
  // Type alias for backward compatibility
  type VTeamDetailsRow = TeamRowData;

  let query = supabase
    .from('v_team_details')
    .select(
      `
      team_id,
      name,
      logo_url,
      image_url,
      wins,
      losses,
      game_wins,
      game_losses,
      division_id,
      divisionname,
      sos,
      power_score,
      win_percentage,
      game_win_percentage,
      players,
      created_at,
      close_match_losses
    `
    )
    .order('name');

  if (options?.divisionId) {
    query = query.eq('division_id', options.divisionId);
  }

  const { data, error } = await query;

  if (error) {
    errorLog('Error fetching teams:', error);
    throw error;
  }

  // Deduplicate by team_id (view may return duplicates for players)
  const uniqueTeamsMap = new Map<string, VTeamDetailsRow>();
  (data || []).forEach((row) => {
    if (!uniqueTeamsMap.has(row.team_id)) {
      uniqueTeamsMap.set(row.team_id, row as VTeamDetailsRow);
    }
  });

  const uniqueTeams = Array.from(uniqueTeamsMap.values());

  // Filter out hidden teams unless explicitly included
  const filteredTeams = options?.includeHidden
    ? uniqueTeams
    : uniqueTeams.filter((team) => team.divisionname !== 'Hidden');

  teamLog(
    `Loaded ${filteredTeams.length} of ${uniqueTeams.length} teams (hidden filtered: ${!options?.includeHidden})`
  );

  return filteredTeams.map(transformTeamRow);
};

// ─── fetchTeamDetails ─────────────────────────────────────────────────────────

/**
 * Fetch full details for a single team from v_team_details view.
 * @throws {Error} When team not found or database error
 */
export const fetchTeamDetails = async (teamId: string): Promise<Team> => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      `
      team_id,
      name,
      logo_url,
      image_url,
      wins,
      losses,
      game_wins,
      game_losses,
      division_id,
      divisionname,
      sos,
      power_score,
      win_percentage,
      game_win_percentage,
      players,
      created_at,
      close_match_losses
    `
    )
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Team not found');

  // Enhanced logging to verify values from v_team_details with the new weighted power score
  teamLog('Team details from v_team_details with weighted Power Score:', {
    id: data.team_id,
    name: data.name,
    sos: data.sos,
    power_score: data.power_score,
    win_percentage: data.win_percentage,
    game_win_percentage: data.game_win_percentage,
  });

  return {
    id: data.team_id,
    name: data.name,
    logoUrl: data.image_url || data.logo_url,
    imageUrl: data.image_url || data.logo_url,
    wins: data.wins || 0,
    losses: data.losses || 0,
    game_wins: data.game_wins || 0,
    game_losses: data.game_losses || 0,
    division: data.division_id,
    divisionName: data.divisionname || null,
    // Use the database-calculated values with the weighted algorithm
    sos: typeof data.sos === 'number' ? data.sos : 0.5,
    power_score: typeof data.power_score === 'number' ? data.power_score : 0,
    win_percentage: data.win_percentage || 0,
    game_win_percentage: data.game_win_percentage || 0,
    players: Array.isArray(data.players) ? data.players : [],
    created_at: data.created_at || new Date().toISOString(),
    close_match_losses: data.close_match_losses,
  } as Team;
};

// ─── fetchTeamAnalysis / upsertTeamAnalysis ───────────────────────────────────

/**
 * Fetch analysis record for a team. Returns null if no analysis exists yet.
 */
export const fetchTeamAnalysis = async (teamId: string): Promise<TeamAnalysis | null> => {
  const { data, error } = await supabase
    .from('team_analysis')
    .select('id, team_id, overall, strengths, weaknesses, trends, rivalry_insights, created_at, updated_at')
    .eq('team_id', teamId)
    .maybeSingle();

  if (error) {
    errorLog('Error fetching team analysis:', error);
    throw error;
  }

  return data as TeamAnalysis | null;
};

/**
 * Upsert (create or update) the analysis record for a team.
 */
export const upsertTeamAnalysis = async (
  teamId: string,
  input: TeamAnalysisInput,
  createdBy: string,
  updatedBy: string
) => {
  const { data, error } = await supabase
    .from('team_analysis')
    .upsert(
      {
        team_id: teamId,
        ...input,
        created_by: createdBy,
        updated_by: updatedBy,
      },
      {
        onConflict: 'team_id',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ─── fetchPendingRequestsCount ────────────────────────────────────────────────

export const fetchPendingRequestsCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('team_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  if (error) throw error;
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

  if (error) throw error;
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
  if (error) throw error;
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
  // Get current season
  const { data: season } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  const { data, error } = await supabase
    .from('team_requests')
    .insert({
      ...request,
      season_id: season?.id,
      status: 'PENDING',
    })
    .select()
    .single();

  if (error) throw error;
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

  if (error) throw error;
  return data;
};

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

  if (fetchError) throw fetchError;

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

// ─── fetchAvailableTeams ──────────────────────────────────────────────────────

export const fetchAvailableTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, logo_url, image_url, division_id, wins, losses')
    .order('name');

  if (error) throw error;

  // Transform data to match the Team interface
  return (data || []).map((team) => ({
    id: team.id,
    name: team.name,
    logoUrl: team.image_url || team.logo_url,
    imageUrl: team.image_url || team.logo_url,
    division: team.division_id,
    wins: team.wins,
    losses: team.losses,
    power_score: 0, // Default values for required properties
    sos: 0,
    win_percentage: 0,
    game_win_percentage: 0,
  }));
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

    if (error) throw error;
  } else {
    const { error } = await supabase.from('team_memberships').insert({
      user_id: userId,
      team_id: teamId,
      is_approved: false,
    });

    if (error) throw error;
  }
};

// ─── leaveTeamMembership ──────────────────────────────────────────────────────

export const leaveTeamMembership = async (userId: string): Promise<void> => {
  const { error } = await supabase.from('team_memberships').delete().eq('user_id', userId);

  if (error) throw error;
};

// ─── fetchTeamBadges ──────────────────────────────────────────────────────────

export const fetchTeamBadges = async (teamId: string): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching team badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};

// ─── fetchAllTeamBadges ───────────────────────────────────────────────────────

export const fetchAllTeamBadges = async (): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching all team badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};

// ─── fetchSeasonBadges ────────────────────────────────────────────────────────

export const fetchSeasonBadges = async (seasonId: string): Promise<TeamBadgeEvent[]> => {
  const { data, error } = await supabase
    .from('team_badge_events')
    .select('id, team_id, badge_type, season_id, awarded_at, metadata, is_active, created_at')
    .eq('season_id', seasonId)
    .eq('is_active', true)
    .order('awarded_at', { ascending: false });

  if (error) {
    errorLog('Error fetching season badges:', error);
    throw error;
  }

  return (data || []).map((badge) => transformBadge(badge as RawBadgeData));
};

// ─── fetchPendingMembershipCount ──────────────────────────────────────────────

export const fetchPendingMembershipCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('team_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('is_approved', false);

  if (!error && count !== null) {
    return count;
  }
  return 0;
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

  if (membershipsError) throw membershipsError;
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

  if (profilesResult.error) throw profilesResult.error;
  if (teamsResult.error) throw teamsResult.error;

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

  if (error) throw error;
};
