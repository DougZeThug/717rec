import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

import { isConfirmedTie } from './tieMetadata';

/**
 * Service layer for core match query operations
 */

type MatchRow = Tables<'matches'>;

/** Team columns embedded in match join-selects. */
type MatchTeamSummary = Pick<Tables<'teams'>, 'id' | 'name' | 'logo_url' | 'image_url'>;

/** Match columns returned by the pending query (everything except metadata + season_id). */
type MatchListRow = Omit<MatchRow, 'metadata' | 'season_id'>;

/** A timeslot row plus its joined team summary. */
type MatchTimeslotRow = Tables<'team_timeslots'> & {
  teams: (MatchTeamSummary & Pick<Tables<'teams'>, 'division_id'>) | null;
};

/**
 * Fetch pending matches (completed but no winner) awaiting an admin decision.
 *
 * Ties an admin has already confirmed are stamped in `metadata` and drop out
 * here, so a resolved tie does not come back every time the queue reloads.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchPendingMatches = async (): Promise<MatchListRow[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at, metadata'
    )
    .eq('iscompleted', true)
    .is('winner_id', null)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch pending matches');

  // One pass: skip settled ties and drop the metadata column as we go.
  const pending: MatchListRow[] = [];
  for (const row of data ?? []) {
    if (isConfirmedTie(row.metadata)) continue;
    const { metadata: _metadata, ...match } = row;
    pending.push(match);
  }
  return pending;
};

/**
 * Fetch pending score matches from v_pending_matches view
 * @throws {DatabaseError} When database operations fail
 */
export const fetchPendingScoresMatches = async (): Promise<Tables<'v_pending_matches'>[]> => {
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
export const fetchMatchTimeslots = async (formattedDate: string): Promise<MatchTimeslotRow[]> => {
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
        image_url,
        division_id
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
 * Match context joined onto a score submission so an admin can see which
 * match and which teams a report belongs to before approving it.
 */
interface ScoreSubmissionMatch {
  id: string;
  date: string | null;
  location: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1: Pick<Tables<'teams'>, 'id' | 'name'> | null;
  team2: Pick<Tables<'teams'>, 'id' | 'name'> | null;
}

/** A pending score submission plus the match it reports on. */
export type ScoreSubmissionWithMatch = Pick<
  Tables<'score_submissions'>,
  | 'id'
  | 'match_id'
  | 'submitter_name'
  | 'submitter_team'
  | 'message'
  | 'status'
  | 'created_at'
  | 'reviewed_by'
  | 'reviewed_at'
> & { match: ScoreSubmissionMatch | null };

/**
 * Fetch pending score submissions with their match and team names.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchScoreSubmissions = async (): Promise<ScoreSubmissionWithMatch[]> => {
  const { data, error } = await supabase
    .from('score_submissions')
    .select(
      'id, match_id, submitter_name, submitter_team, message, status, created_at, reviewed_by, reviewed_at, match:matches!score_submissions_match_id_fkey(id, date, location, team1_id, team2_id, team1:teams!matches_team1_id_fkey(id, name), team2:teams!matches_team2_id_fkey(id, name))'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) handleDatabaseError(error, 'Failed to fetch score submissions');
  return (data ?? []) as ScoreSubmissionWithMatch[];
};

/**
 * Fetch team IDs for a specific match
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When match not found
 */
export const fetchMatchTeamIds = async (
  matchId: string
): Promise<Pick<MatchRow, 'team1_id' | 'team2_id'>> => {
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) handleDatabaseError(matchError, 'Failed to fetch match team IDs');
  return ensureFound(matchData, 'Match', matchId);
};
