import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog } from '@/utils/logger';
import { transformDatabasePlayoffMatchesWithTeams } from '@/utils/matchTransformers';
import type { BracketState, PlayoffBracket } from '@/utils/playoffs/playoffTypes';
import type { Team } from '@/utils/playoffs/playoffTypes';

/**
 * Service layer for bracket read operations
 * Abstracts Supabase queries from presentation components
 */

export interface BracketOption {
  id: string;
  title: string;
}

// Helper to normalize bracket state - handles both legacy and current DB values
const computeBracketState = (state: string): BracketState =>
  state === 'in_progress' || state === 'underway'
    ? 'in_progress'
    : state === 'completed' || state === 'complete'
      ? 'completed'
      : 'pending';

// Normalization function to convert Supabase rows to PlayoffBracket objects
const mapRowToBracket = (row: any): PlayoffBracket => ({
  ...row,
  name: row.title || row.name,
  matches: [],
  state: computeBracketState(row.state || 'pending'),
});

/**
 * Fetch all brackets ordered by title for selector dropdowns
 */
export const fetchBracketsForSelector = async (): Promise<BracketOption[]> => {
  const { data, error } = await supabase.from('brackets').select('id, title').order('title');

  if (error) {
    dbLog('Error fetching brackets for selector:', error);
    handleDatabaseError(error, 'Failed to fetch brackets for selector');
  }

  return data || [];
};

/**
 * Fetch a single bracket's basic data by ID
 * Used by usePlayoffBracketData hook
 */
export const fetchPlayoffBracketData = async (bracketId: string): Promise<PlayoffBracket | null> => {
  const { data, error } = await supabase
    .from('brackets')
    .select(
      'id, title, format, state, division_id, challonge_tournament_id, uses_brackets_manager, created_at, wb_champion_id, bracket_data, migrated, migrated_at, reset_match_needed'
    )
    .eq('id', bracketId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff bracket data');
  }

  if (!data) return null;

  return mapRowToBracket(data);
};

/**
 * Fetch playoff matches for a bracket with team data
 * Used by usePlayoffMatches hook
 */
export const fetchPlayoffMatches = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select(
      `
      *,
      team1:teams!fk_playoff_matches_team1(id, name, logo_url, image_url),
      team2:teams!fk_playoff_matches_team2(id, name, logo_url, image_url),
      playoff_games(*)
    `
    )
    .eq('bracket_id', bracketId)
    .order('round')
    .order('position');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff matches');
  }

  if (!data || data.length === 0) return [];

  return transformDatabasePlayoffMatchesWithTeams(data);
};

/**
 * Validate seeds for a division using RPC
 * Used by useSeedValidation hook
 */
export const validateSeeds = async (divisionId: string) => {
  const { data, error } = await supabase.rpc('validate_division_seeds', {
    p_division_id: divisionId,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to validate seeds');
  }

  return data || [];
};

/**
 * Fetch bracket participants ordered by position
 * Used by BracketDetail component
 */
export const fetchBracketParticipants = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('participant')
    .select('id, name, position')
    .eq('tournament_id', bracketId)
    .order('position', { ascending: true });

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket participants');
  }

  return data;
};

/**
 * Fetch brackets overview (with divisions) optionally filtered by season
 * Used by usePlayoffViewModel.compat.ts
 */
export const fetchBracketsOverview = async (seasonId?: string | null) => {
  let query = supabase
    .from('brackets')
    .select(
      `
      *,
      divisions(*)
    `
    )
    .order('created_at', { ascending: false });

  if (seasonId) {
    query = query.eq('season_id', seasonId);
  }

  const { data, error } = await query;

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets overview');
  }

  return data ?? [];
};

/**
 * Fetch bracket info for JSONB/uses_brackets_manager check
 * Used by BracketView component
 */
export const fetchBracketInfo = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('brackets')
    .select('id, title, format, state, uses_brackets_manager, bracket_data, participants')
    .eq('id', bracketId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket info');
  }

  return data;
};

/**
 * Fetch final standings for a completed bracket
 * Used by FinalStandings component
 */
export const fetchFinalStandings = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('playoff_team_records')
    .select(
      `
      placement,
      wins,
      losses,
      game_wins,
      game_losses,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url
      )
    `
    )
    .eq('bracket_id', bracketId)
    .not('placement', 'is', null)
    .order('placement', { ascending: true });

  if (error) {
    handleDatabaseError(error, 'Failed to fetch final standings');
  }

  return data;
};

/**
 * Fetch playoff teams with seed data from v_team_details and teams tables
 * Used by usePlayoffTeams hook
 */
export const fetchPlayoffTeams = async (): Promise<Team[]> => {
  const [teamDetailsResult, teamsResult] = await Promise.all([
    supabase.from('v_team_details').select(`
        team_id,
        name,
        logo_url,
        image_url,
        division_id,
        divisionname,
        wins,
        losses,
        game_wins,
        game_losses,
        players,
        power_score,
        sos,
        win_percentage,
        game_win_percentage,
        close_match_losses
      `),
    supabase.from('teams').select('id, seed'),
  ]);

  if (teamDetailsResult.error) {
    handleDatabaseError(teamDetailsResult.error, 'Failed to fetch playoff team details');
  }
  if (teamsResult.error) {
    handleDatabaseError(teamsResult.error, 'Failed to fetch team seeds');
  }

  const teamDetails = teamDetailsResult.data ?? [];
  const teamSeeds = new Map((teamsResult.data ?? []).map((t) => [t.id, t.seed]));

  return teamDetails.map((row) => ({
    id: row.team_id,
    name: row.name ?? 'Unnamed Team',
    logoUrl: row.image_url ?? row.logo_url ?? null,
    imageUrl: row.image_url ?? row.logo_url ?? null,
    division_id: row.division_id ?? null,
    division: row.division_id ?? null,
    divisionName: row.divisionname ?? null,
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    game_wins: row.game_wins ?? 0,
    game_losses: row.game_losses ?? 0,
    players: Array.isArray(row.players) ? row.players : [],
    created_at: new Date().toISOString(),
    seed: teamSeeds.get(row.team_id) ?? null,
    power_score: row.power_score ?? 0,
    sos: row.sos ?? 0.5,
    win_percentage: row.win_percentage ?? 0,
    game_win_percentage: row.game_win_percentage ?? 0,
    close_match_losses: row.close_match_losses ?? 0,
  })) as Team[];
};

/**
 * Fetch a brackets-manager match with its stage data
 * Used by usePlayoffEditMatch hook (integer matchId path)
 */
export const fetchBmMatchWithStage = async (matchId: number) => {
  const { data, error } = await supabase
    .from('match')
    .select('*, stage:stage_id(*)')
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets-manager match');
  }

  return data;
};

/**
 * Fetch a legacy playoff match with bracket info and games
 * Used by usePlayoffEditMatch hook (UUID matchId path)
 */
export const fetchPlayoffMatchWithBracket = async (matchId: string) => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select(
      `
      *,
      bracket:brackets!playoff_matches_bracket_id_fkey(id, uses_brackets_manager),
      playoff_games(*)
    `
    )
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff match with bracket');
  }

  return data;
};

/**
 * Fetch brackets-manager match opponent and stage data
 * Used by usePlayoffMatchUpdate hook (BM path)
 */
export const fetchBmMatchData = async (matchId: number) => {
  const { data, error } = await supabase
    .from('match')
    .select('opponent1_id, opponent2_id, stage_id')
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets-manager match data');
  }

  return data;
};

/**
 * Fetch participants by their IDs
 * Used by usePlayoffMatchUpdate hook (BM path)
 */
export const fetchParticipantsByIds = async (ids: number[]) => {
  const { data, error } = await supabase
    .from('participant')
    .select('id, name, tournament_id')
    .in('id', ids);

  if (error) {
    handleDatabaseError(error, 'Failed to fetch participants');
  }

  return data ?? [];
};

/**
 * Fetch a legacy playoff match's team IDs for score update
 * Used by usePlayoffMatchUpdate hook (legacy path)
 */
export const fetchPlayoffMatchTeams = async (matchId: string) => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff match team data');
  }

  return data;
};

// ============================================================
// useBracketData step functions (brackets-manager SQL flow)
// ============================================================

/**
 * Fetch bracket with division join for bracket data loading
 * Used by useBracketData hook (step 1)
 */
export const fetchBracketWithDivision = async (bracketId: string) => {
  const { data, error } = await supabase
    .from('brackets')
    .select(
      `
      id,
      title,
      format,
      state,
      division_id,
      divisions!inner(display_division, name),
      challonge_tournament_id,
      uses_brackets_manager,
      bracket_data
    `
    )
    .eq('id', bracketId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch bracket with division');
  }

  return data;
};

/**
 * Fetch stage and participants for a tournament concurrently
 * Used by useBracketData hook (step 2)
 */
export const fetchStageAndParticipants = async (bracketId: string) => {
  const [stageResult, participantsResult] = await Promise.all([
    supabase.from('stage').select('id, name, type, tournament_id').eq('tournament_id', bracketId),
    supabase
      .from('participant')
      .select('id, name, position, tournament_id')
      .eq('tournament_id', bracketId),
  ]);

  if (stageResult.error) {
    handleDatabaseError(stageResult.error, 'Failed to fetch bracket stage');
  }
  if (participantsResult.error) {
    handleDatabaseError(participantsResult.error, 'Failed to fetch bracket participants');
  }

  return {
    stages: stageResult.data ?? [],
    participants: participantsResult.data ?? [],
  };
};

/**
 * Fetch groups and matches for a stage concurrently
 * Used by useBracketData hook (step 3)
 */
export const fetchGroupsAndMatches = async (stageId: number) => {
  const [groupsResult, matchesResult] = await Promise.all([
    supabase.from('group').select('id, number, stage_id').eq('stage_id', stageId),
    supabase
      .from('match')
      .select(
        'id, group_id, round_id, number, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
      )
      .eq('stage_id', stageId),
  ]);

  if (groupsResult.error) {
    handleDatabaseError(groupsResult.error, 'Failed to fetch bracket groups');
  }
  if (matchesResult.error) {
    handleDatabaseError(matchesResult.error, 'Failed to fetch bracket matches');
  }

  return {
    groups: groupsResult.data ?? [],
    matches: matchesResult.data ?? [],
  };
};

/**
 * Fetch team details by team names
 * Used by useBracketData hook (step 4)
 */
export const fetchTeamsByNames = async (teamNames: string[]) => {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, image_url')
    .in('name', teamNames);

  if (error) {
    handleDatabaseError(error, 'Failed to fetch teams by names');
  }

  return data ?? [];
};
