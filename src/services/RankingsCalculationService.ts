import { supabase } from '@/integrations/supabase/client';
import { fetchCompletedPlayoffMatchesForSeason } from '@/services/brackets/read/PlayoffSeasonMatchService';
import { Match } from '@/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { transformDatabaseMatches } from '@/utils/matchTransformers';
import { buildOrderedMatchesForStreaks } from '@/utils/rankingUtils/buildOrderedMatchesForStreaks';

/**
 * Fetch all matches (newest first) with the columns needed for rankings calculations.
 *
 * Playoff games are included so the Standings streak column and the game stats
 * recomputed client-side describe the same games as the record and rating in
 * v_team_details. They carry no date, so the merged list is stamped with an
 * explicit order.
 */
export const fetchRankingsData = async (): Promise<Match[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .order('date', { ascending: false });

  if (error) handleDatabaseError(error, 'Failed to fetch rankings data');
  const regularMatches = transformDatabaseMatches(data ?? [], { normalizeDate: false });

  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (seasonError) handleDatabaseError(seasonError, 'Failed to fetch active season for rankings');
  if (!activeSeason) return regularMatches;

  const playoffMatches = await fetchCompletedPlayoffMatchesForSeason(activeSeason.id);
  if (playoffMatches.length === 0) return regularMatches;

  // The helper returns oldest first; reverse to keep this function's newest-first
  // contract. orderKey travels with each match, so streaks still resolve correctly.
  return buildOrderedMatchesForStreaks(regularMatches, playoffMatches).reverse();
};
