import { supabase } from '@/integrations/supabase/client';

/**
 * Score submission queries and pending/uncompleted match lookups.
 */

/**
 * Fetch pending matches (completed but no winner = ties)
 * @throws raw Supabase error on failure
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

  if (error) throw error;
  return data || [];
};

/**
 * Fetch uncompleted matches
 * @throws raw Supabase error on failure
 */
export const fetchUncompletedMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .eq('iscompleted', false)
    .order('date');

  if (error) throw error;
  return data || [];
};

/**
 * Fetch pending score matches from v_pending_matches view
 * @throws raw Supabase error on failure
 */
export const fetchPendingScoresMatches = async () => {
  const { data, error } = await supabase
    .from('v_pending_matches')
    .select(
      'id, team1_id, team2_id, team1_name, team2_name, team1_logo, team2_logo, date, location'
    )
    .limit(10);

  if (error) throw error;
  return data || [];
};

/**
 * Fetch match timeslots for a given formatted date (yyyy-MM-dd)
 * @throws Error with user-friendly message on failure
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
    throw new Error('Failed to load timeslots');
  }

  return data ?? [];
};

/**
 * Fetch pending score submissions
 * @throws raw Supabase error on failure
 */
export const fetchScoreSubmissions = async () => {
  const { data, error } = await supabase
    .from('score_submissions')
    .select(
      'id, match_id, submitter_name, submitter_team, message, status, created_at, reviewed_by, reviewed_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch match details needed for tie cancellation
 * @throws raw Supabase error on failure
 * @throws Error if match not found
 */
export const fetchMatchForTie = async (matchId: string) => {
  const { data: currentMatch, error: fetchError } = await supabase
    .from('matches')
    .select('winner_id, loser_id, team1_id, team2_id, team1_game_wins, team2_game_wins')
    .eq('id', matchId)
    .single();

  if (fetchError) throw fetchError;
  if (!currentMatch) throw new Error('Match not found');
  return currentMatch;
};
