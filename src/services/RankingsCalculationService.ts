import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export const fetchRankingsData = async (): Promise<Match[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .order('date', { ascending: false });

  if (error) handleDatabaseError(error, 'Failed to fetch rankings data');
  return transformDatabaseMatches(data ?? [], { normalizeDate: false });
};
