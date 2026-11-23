import type { Tables } from '@/integrations/supabase/types';
type PlayerSeasonStatsRow = Tables<'v_player_season_stats'>;
import { supabase } from '@/integrations/supabase/client';

import { handleLiveScoringError } from './LiveMatchService';

// Single literal (not concatenated) so PostgREST result typing can parse it.
const PLAYER_SEASON_STATS_COLUMNS =
  'season_id, player_id, team_id, display_name, matches_with_rounds, rounds_thrown, rounds_won, points_for, points_against, net_points_won, bags_in, bags_on, bags_off, four_baggers, game_wins, game_losses, match_wins, match_losses';

export const PlayerStatsService = {
  fetchTeamPlayerSeasonStats: async (
    teamId: string,
    seasonId: string
  ): Promise<PlayerSeasonStatsRow[]> => {
    const { data, error } = await supabase
      .from('v_player_season_stats')
      .select(PLAYER_SEASON_STATS_COLUMNS)
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .order('rounds_thrown', { ascending: false });

    if (error) handleLiveScoringError(error, 'Failed to fetch player season stats');
    return data ?? [];
  },
};
