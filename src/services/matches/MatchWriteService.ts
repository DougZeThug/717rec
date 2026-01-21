import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';

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
