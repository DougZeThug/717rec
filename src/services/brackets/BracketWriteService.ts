import { supabase } from '@/integrations/supabase/client';
import {
  bulkUpdateTeamSeeds as bulkUpdateTeamSeedsService,
  updateTeamSeed as updateTeamSeedService,
} from '@/services/teams/TeamSeedService';
import type {
  BulkTeamSeedUpdateResult,
  TeamSeedUpdateInput,
  TeamSeedUpdateResult,
} from '@/types/seeding';
import { handleDatabaseError } from '@/utils/errorHandler';
import { dbLog } from '@/utils/logger';

/**
 * Service layer for bracket write operations
 * Abstracts Supabase mutations from presentation components
 */

/** The fields of a bracket an admin can change after it exists. */
export interface BracketUpdateInput {
  title?: string;
  division_id?: string | null;
  season_id?: string | null;
}

/**
 * Update a bracket's title, division, or season.
 *
 * Only these fields are safe to change. A bracket's format, size, and team list
 * define the generated stage, rounds, and matches, so changing any of those
 * means deleting the bracket and building it again. Use Update Seeding or
 * Rearrange Teams for structural changes to a bracket that already exists.
 */
export const updateBracket = async (
  bracketId: string,
  patch: BracketUpdateInput
): Promise<void> => {
  const { error } = await supabase.from('brackets').update(patch).eq('id', bracketId);

  if (error) {
    dbLog('Error updating bracket:', error);
    handleDatabaseError(error, 'Failed to update bracket');
  }
};

/**
 * Delete a bracket by ID
 */
export const deleteBracket = async (bracketId: string): Promise<void> => {
  const { error } = await supabase.from('brackets').delete().eq('id', bracketId);

  if (error) {
    dbLog('Error deleting bracket:', error);
    handleDatabaseError(error, 'Failed to delete bracket');
  }
};

/**
 * Update a playoff match result (winner, scores, status)
 * Used by usePlayoffActions hook
 *
 * updated_at is stamped here rather than left to the caller: playoff_matches has
 * no updated_at trigger, and season stats order playoff results by that column
 * (PlayoffSeasonMatchService.recordedAt) to work out current streaks.
 */
export const updatePlayoffMatchResult = async (
  matchId: string,
  data: {
    winner_id: string;
    loser_id: string;
    team1_score: number;
    team2_score: number;
    status: string;
  }
): Promise<void> => {
  const { error } = await supabase
    .from('playoff_matches')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', matchId);

  if (error) {
    handleDatabaseError(error, 'Failed to update playoff match result');
  }
};

/**
 * Upsert a playoff game record
 * Used by usePlayoffActions hook
 */
export const upsertPlayoffGame = async (gameData: {
  id: string;
  match_id: string;
  game_number: number;
  team1_score: number;
  team2_score: number;
  winner_id: string | null | undefined;
}): Promise<void> => {
  const { error } = await supabase.from('playoff_games').upsert(gameData);

  if (error) {
    handleDatabaseError(error, 'Failed to upsert playoff game');
  }
};

/**
 * Update a legacy playoff match with full score data
 * Used by usePlayoffMatchUpdate hook (legacy path)
 */
export const updatePlayoffMatchScores = async (
  matchId: string,
  data: {
    team1_score: number;
    team2_score: number;
    winner_id: string;
    loser_id: string;
    status: string;
    updated_at: string;
  }
): Promise<void> => {
  const { error } = await supabase.from('playoff_matches').update(data).eq('id', matchId);

  if (error) {
    handleDatabaseError(error, 'Failed to update playoff match scores');
  }
};

/**
 * Delete all playoff games for a match
 * Used by usePlayoffMatchUpdate hook (legacy path)
 */
export const deletePlayoffGames = async (matchId: string): Promise<void> => {
  const { error } = await supabase.from('playoff_games').delete().eq('match_id', matchId);

  if (error) {
    handleDatabaseError(error, 'Failed to delete playoff games');
  }
};

/**
 * Insert multiple playoff game records
 * Used by usePlayoffMatchUpdate hook (legacy path)
 */
export const insertPlayoffGames = async (
  games: Array<{
    match_id: string;
    game_number: number;
    team1_score: number;
    team2_score: number;
    winner_id: string | null;
  }>
): Promise<void> => {
  const { error } = await supabase.from('playoff_games').insert(games);

  if (error) {
    handleDatabaseError(error, 'Failed to insert playoff games');
  }
};

/**
 * Atomically replace all playoff_games rows for a match.
 *
 * Wraps DELETE + INSERT in a single SECURITY DEFINER Postgres function so a
 * failed insert no longer leaves the match with an empty game list. Prefer
 * this over calling 'deletePlayoffGames' + 'insertPlayoffGames' separately.
 */
export const replacePlayoffGames = async (
  matchId: string,
  games: Array<{
    game_number: number;
    team1_score: number;
    team2_score: number;
    winner_id: string | null;
  }>
): Promise<void> => {
  const { error } = await supabase.rpc('replace_playoff_games', {
    p_match_id: matchId,
    p_games: games,
  });

  if (error) {
    handleDatabaseError(error, 'Failed to replace playoff games');
  }
};

/**
 * Update a single team's seed value
 * Used by useOptimisticTeamMutations hook
 */
export const updateTeamSeed = (
  teamId: string,
  seed: number | null
): Promise<TeamSeedUpdateResult> => updateTeamSeedService(teamId, seed);

/**
 * Batch update team seeds via RPC
 * Used by useOptimisticTeamMutations hook
 */
export const batchUpdateTeamSeeds = (
  updates: TeamSeedUpdateInput[]
): Promise<BulkTeamSeedUpdateResult[]> => bulkUpdateTeamSeedsService(updates);
