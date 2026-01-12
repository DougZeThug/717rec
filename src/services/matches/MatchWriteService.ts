import { supabase } from '@/integrations/supabase/client';
import { dbLog, errorLog } from '@/utils/logger';

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
 */
export const fetchActiveSeason = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    errorLog('Error fetching active season:', error);
    return null;
  }

  return data?.id || null;
};

/**
 * Batch create multiple matches
 */
export const batchCreateMatches = async (matches: MatchCreateData[]) => {
  const { data, error } = await supabase.from('matches').insert(matches).select();

  if (error) {
    dbLog('Error batch creating matches:', error);
    throw error;
  }

  return data;
};

/**
 * Update a single match with scores and completion status
 */
export const updateMatchScore = async (matchId: string, updates: MatchUpdateData) => {
  const { error } = await supabase.from('matches').update(updates).eq('id', matchId);

  if (error) {
    dbLog('Error updating match score:', error);
    throw error;
  }
};
