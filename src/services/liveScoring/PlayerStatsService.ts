import type { PlayerMatchStatsRow, PlayerSeasonStatsRow } from './dbTypes';
import { liveDb } from './liveDb';
import { handleLiveScoringError } from './LiveMatchService';

// Single literals (not concatenated) so PostgREST result typing can parse them.
const PLAYER_MATCH_STATS_COLUMNS =
  'match_id, player_id, team_id, display_name, season_id, rounds_thrown, rounds_won, points_for, points_against, net_points_won, bags_in, bags_on, bags_off, four_baggers';

const PLAYER_SEASON_STATS_COLUMNS =
  'season_id, player_id, team_id, display_name, matches_with_rounds, rounds_thrown, rounds_won, points_for, points_against, net_points_won, bags_in, bags_on, bags_off, four_baggers, game_wins, game_losses, match_wins, match_losses';

export const PlayerStatsService = {
  fetchPlayerMatchStats: async (matchId: string): Promise<PlayerMatchStatsRow[]> => {
    const { data, error } = await liveDb
      .from('v_player_match_stats')
      .select(PLAYER_MATCH_STATS_COLUMNS)
      .eq('match_id', matchId);

    if (error) handleLiveScoringError(error, 'Failed to fetch player match stats');
    return data ?? [];
  },

  fetchTeamPlayerSeasonStats: async (
    teamId: string,
    seasonId: string
  ): Promise<PlayerSeasonStatsRow[]> => {
    const { data, error } = await liveDb
      .from('v_player_season_stats')
      .select(PLAYER_SEASON_STATS_COLUMNS)
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .order('rounds_thrown', { ascending: false });

    if (error) handleLiveScoringError(error, 'Failed to fetch player season stats');
    return data ?? [];
  },
};
