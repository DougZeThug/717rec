import { supabase } from '@/integrations/supabase/client';
import { Team } from '@/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { TeamRowData, transformTeamRow } from '@/utils/teamTransformer';

import { TeamsQueryOptions } from './teamFetch.types';

// ─── fetchTeamsFromApi ────────────────────────────────────────────────────────

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
    handleDatabaseError(error, 'Failed to fetch teams with options');
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

  if (error) handleDatabaseError(error, 'Failed to fetch team details');
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

  return transformTeamRow(data as TeamRowData);
};

// ─── fetchAvailableTeams ──────────────────────────────────────────────────────

export const fetchAvailableTeams = async (): Promise<Team[]> => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, logo_url, image_url, division_id, wins, losses')
    .order('name');

  if (error) handleDatabaseError(error, 'Failed to fetch available teams');

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

// ─── fetchTeamForStats ────────────────────────────────────────────────────────

/**
 * Fetch basic team data used for stats calculations.
 * Returns null if team not found or database error occurs.
 * Exact query preserved from src/utils/teamStatsUtils/fetchTeamData.ts.
 */
export const fetchTeamForStats = async (teamId: string) => {
  const { data: team, error } = await supabase
    .from('teams')
    .select(
      `
      id,
      name,
      wins,
      losses,
      game_wins,
      game_losses,
      divisions (name)
    `
    )
    .eq('id', teamId)
    .maybeSingle();

  if (error || !team) {
    return null;
  }

  return team;
};
