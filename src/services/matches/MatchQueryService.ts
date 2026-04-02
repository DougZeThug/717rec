import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

/**
 * Service layer for core match query operations
 */

export interface MatchFilters {
  date?: Date;
  bracketId?: string;
}

/**
 * Fetch matches with team details, optionally filtered by date and/or bracket
 * @throws {DatabaseError} When database operations fail
 */
export const fetchMatchesWithTeams = async (filters?: MatchFilters) => {
  let query = supabase
    .from('matches')
    .select(
      `
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
      `
    )
    .order('date', { ascending: true });

  // Apply date filter if provided
  if (filters?.date) {
    const dateStr = filters.date.toISOString().split('T')[0]; // Format as yyyy-MM-dd
    query = query.gte('date', `${dateStr}T00:00:00`).lt('date', `${dateStr}T23:59:59`);
  }

  // Apply bracket filter if provided
  if (filters?.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  const { data, error } = await query;

  if (error) {
    handleDatabaseError(error, 'Failed to fetch matches with teams');
  }

  return data ?? [];
};

/**
 * Fetch pending matches (completed but no winner = ties)
 * @throws {DatabaseError} When database operations fail
 */
export const fetchPendingMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .eq('iscompleted', true)
    .is('winner_id', null)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch pending matches');
  return data || [];
};

/**
 * Fetch uncompleted matches
 * @throws {DatabaseError} When database operations fail
 */
export const fetchUncompletedMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .eq('iscompleted', false)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch uncompleted matches');
  return data || [];
};

/**
 * Fetch pending score matches from v_pending_matches view
 * @throws {DatabaseError} When database operations fail
 */
export const fetchPendingScoresMatches = async () => {
  const { data, error } = await supabase
    .from('v_pending_matches')
    .select(
      'id, team1_id, team2_id, team1_name, team2_name, team1_logo, team2_logo, date, location'
    )
    .limit(10);

  if (error) handleDatabaseError(error, 'Failed to fetch pending score matches');
  return data || [];
};

/**
 * Fetch match timeslots for a given formatted date (yyyy-MM-dd)
 * @throws {DatabaseError} When database operations fail
 */
export const fetchMatchTimeslots = async (formattedDate: string) => {
  const { data, error } = await supabase
    .from('team_timeslots')
    .select(
      `
      id,
      match_date,
      timeslot,
      team_id,
      created_at,
      is_back_to_back,
      is_double_header,
      pair_slot,
      match_sequence,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url
      )
    `
    )
    .eq('match_date', formattedDate);

  if (error) {
    handleDatabaseError(error, 'Failed to load timeslots');
  }

  return data ?? [];
};

/**
 * Fetch pending score submissions
 * @throws {DatabaseError} When database operations fail
 */
export const fetchScoreSubmissions = async () => {
  const { data, error } = await supabase
    .from('score_submissions')
    .select(
      'id, match_id, submitter_name, submitter_team, message, status, created_at, reviewed_by, reviewed_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) handleDatabaseError(error, 'Failed to fetch score submissions');
  return data || [];
};

/**
 * Fetch match details needed for tie cancellation
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When match not found
 */
export const fetchMatchForTie = async (matchId: string) => {
  const { data: currentMatch, error: fetchError } = await supabase
    .from('matches')
    .select('winner_id, loser_id, team1_id, team2_id, team1_game_wins, team2_game_wins')
    .eq('id', matchId)
    .single();

  if (fetchError) handleDatabaseError(fetchError, 'Failed to fetch match for tie');
  return ensureFound(currentMatch, 'Match', matchId);
};

/**
 * Fetch team IDs for a specific match
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When match not found
 */
export const fetchMatchTeamIds = async (matchId: string) => {
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (matchError) handleDatabaseError(matchError, 'Failed to fetch match team IDs');
  return ensureFound(matchData, 'Match', matchId);
};
