import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';
import { warnLog } from '@/utils/logger';

/**
 * Service layer for match write operations
 * Abstracts Supabase mutations from presentation components
 */

export interface MatchCreateData {
  team1_id: string | null;
  team2_id: string | null;
  date: string;
  location: string;
  iscompleted: boolean;
  round_number: number;
  team1_score: number;
  team2_score: number;
  team1_game_wins: number;
  team2_game_wins: number;
  season_id: string | null;
}

export interface MatchUpdateData {
  team1_score: number;
  team2_score: number;
  iscompleted: boolean;
  winner_id: string | null;
  loser_id: string | null;
}

/**
 * Fetch the active season ID
 * @throws {DatabaseError} When database operations fail
 * @throws {NotFoundError} When no active season exists
 */
export const fetchActiveSeason = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch active season');
  }

  return ensureFound(data?.id, 'Active season');
};

/**
 * Batch create multiple matches
 * @throws {DatabaseError} When database operations fail
 */
export const batchCreateMatches = async (matches: MatchCreateData[]) => {
  const { data, error } = await supabase.from('matches').insert(matches).select();

  if (error) {
    handleDatabaseError(error, 'Failed to batch create matches');
  }

  return data;
};

/**
 * Update a single match with scores and completion status
 * @throws {DatabaseError} When database operations fail
 */
export const updateMatchScore = async (matchId: string, updates: MatchUpdateData) => {
  const { error } = await supabase.from('matches').update(updates).eq('id', matchId);

  if (error) {
    handleDatabaseError(error, 'Failed to update match score');
  }
};

/**
 * Input for creating a single match (active season is fetched internally)
 */
export interface MatchInsertInput {
  team1Id: string | null | undefined;
  team2Id: string | null | undefined;
  date: string;
  location: string;
  iscompleted: boolean | undefined;
  team1Score: number | undefined;
  team2Score: number | undefined;
  winnerId: string | null | undefined;
  loserId: string | null | undefined;
  team1_game_wins: number;
  team2_game_wins: number;
}

/**
 * Create a single match, fetching the active season internally.
 * Active season errors are swallowed (non-fatal) per original hook behavior.
 * @throws raw Supabase error if insert fails
 */
export const createMatch = async (insertInput: MatchInsertInput) => {
  // Fetch active season (swallow error per original hook behavior)
  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (seasonError) {
    warnLog('Error fetching active season:', seasonError);
  }

  const { data, error } = await supabase
    .from('matches')
    .insert({
      team1_id: insertInput.team1Id,
      team2_id: insertInput.team2Id,
      date: insertInput.date,
      location: insertInput.location,
      iscompleted: insertInput.iscompleted,
      team1_score: insertInput.team1Score,
      team2_score: insertInput.team2Score,
      winner_id: insertInput.winnerId,
      loser_id: insertInput.loserId,
      team1_game_wins: insertInput.team1_game_wins,
      team2_game_wins: insertInput.team2_game_wins,
      round_number: 0,
      season_id: activeSeason?.id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Delete a match by ID
 * @throws raw Supabase error on failure
 */
export const deleteMatch = async (matchId: string) => {
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  if (error) throw error;
};

/**
 * Update a match and return the updated single record
 * @throws raw Supabase error on failure
 */
export const updateMatch = async (matchId: string, updatePayload: object) => {
  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a match and return all updated records as an array
 * @throws raw Supabase error on failure
 */
export const updateMatchArray = async (matchId: string, updatePayload: object) => {
  const { data, error } = await supabase
    .from('matches')
    .update(updatePayload)
    .eq('id', matchId)
    .select();

  if (error) throw error;
  return data;
};

/**
 * Reverse team statistics for a completed match
 * @throws Error if the RPC call fails
 */
export const reverseTeamStats = async (
  winnerId: string,
  loserId: string,
  winnerGameWins: number,
  loserGameWins: number
): Promise<void> => {
  const { error: reverseError } = await supabase.rpc('reverse_team_stats', {
    p_winner_id: winnerId,
    p_loser_id: loserId,
    p_winner_game_wins: winnerGameWins,
    p_loser_game_wins: loserGameWins,
  });

  if (reverseError) {
    throw new Error(`Failed to reverse team stats: ${reverseError.message}`);
  }
};

/**
 * Refresh team season stats (non-fatal — swallows errors with warning)
 */
export const upsertTeamSeasonStats = async (): Promise<void> => {
  const { error: seasonStatsError } = await supabase.rpc('upsert_team_season_stats');
  if (seasonStatsError) {
    warnLog('Failed to refresh season stats:', seasonStatsError);
  }
};

// ---------------------------------------------------------------------------
// Functions added for Batch 11 refactor — moved from useAutoScheduleSave
// ---------------------------------------------------------------------------

/**
 * Fetch the active season ID, returning undefined if no active season exists.
 * Does NOT throw if no active season found — only throws on database error.
 * Exact query (maybeSingle) copied from useAutoScheduleSave.ts
 * @throws raw Supabase error on database failure
 */
export const fetchActiveSeasonIdOptional = async (): Promise<string | undefined> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data?.id;
};

/**
 * Insert auto-scheduled matches (includes metadata field) and return inserted rows.
 * Exact insert copied from useAutoScheduleSave.ts
 * @throws raw Supabase error on failure
 */
export const saveAutoScheduleMatches = async (matches: Database['public']['Tables']['matches']['Insert'][]) => {
  const { data, error } = await supabase.from('matches').insert(matches).select();
  if (error) throw error;
  return data;
};

/**
 * Create a score submission
 * @throws raw Supabase error on failure
 */
export interface ScoreSubmissionInsertData {
  match_id: string;
  submitter_name: string;
  submitter_team: string | null;
  message: string;
}

export const createScoreSubmission = async (data: ScoreSubmissionInsertData) => {
  const { error } = await supabase.from('score_submissions').insert(data);
  if (error) throw error;
  return true;
};

/**
 * Update score submission status (approve or reject).
 * Fetches current user ID internally.
 * @throws raw Supabase error on failure
 */
export const updateScoreSubmissionStatus = async (
  submissionId: string,
  status: 'approved' | 'rejected'
) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('score_submissions')
    .update({
      status,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) throw error;
};

/**
 * Set winner and loser on a match (approve result)
 * @throws raw Supabase error on failure
 */
export const approveMatch = async (
  matchId: string,
  winnerId: string,
  loserId: string
) => {
  const { error } = await supabase
    .from('matches')
    .update({
      winner_id: winnerId,
      loser_id: loserId,
    })
    .eq('id', matchId);

  if (error) throw error;
};

/**
 * Clear winner/loser on a match (mark as tie)
 * @throws raw Supabase error on failure
 */
export const setMatchAsTie = async (matchId: string) => {
  const { error } = await supabase
    .from('matches')
    .update({
      winner_id: null,
      loser_id: null,
    })
    .eq('id', matchId);

  if (error) throw error;
};
