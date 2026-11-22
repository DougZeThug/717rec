import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';

/**
 * Fetch brackets-manager match data (match, match_game, participant).
 * Used by useBracketsManagerMatch hook.
 */
export const fetchBracketsManagerMatchData = async (matchId: number) => {
  // Fetch match data
  const { data: matchData, error: matchError } = await supabase
    .from('match')
    .select(
      'id, stage_id, group_id, round_id, number, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
    )
    .eq('id', matchId)
    .maybeSingle();

  if (matchError) handleDatabaseError(matchError, 'Failed to fetch bracket match');
  const safeMatchData = ensureFound(matchData, 'BracketMatch', String(matchId));

  // Fetch games for this match
  const { data: gamesData, error: gamesError } = await supabase
    .from('match_game')
    .select('id, number, match_id, status, opponent1_score, opponent2_score')
    .eq('match_id', matchId)
    .order('number', { ascending: true });

  if (gamesError) handleDatabaseError(gamesError, 'Failed to fetch bracket match games');

  // Fetch participant names in parallel
  const [opponent1Result, opponent2Result] = await Promise.all([
    safeMatchData.opponent1_id
      ? supabase
          .from('participant')
          .select('id, name, team_id')
          .eq('id', safeMatchData.opponent1_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    safeMatchData.opponent2_id
      ? supabase
          .from('participant')
          .select('id, name, team_id')
          .eq('id', safeMatchData.opponent2_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // Treat PGRST116 (row not found) as null, throw other errors
  if (opponent1Result.error && opponent1Result.error.code !== 'PGRST116') {
    handleDatabaseError(opponent1Result.error, 'Failed to fetch opponent 1');
  }
  if (opponent2Result.error && opponent2Result.error.code !== 'PGRST116') {
    handleDatabaseError(opponent2Result.error, 'Failed to fetch opponent 2');
  }

  return {
    matchData: safeMatchData,
    gamesData: gamesData || [],
    opponent1Data: opponent1Result.data,
    opponent2Data: opponent2Result.data,
  };
};
