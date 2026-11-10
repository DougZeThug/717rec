// FAKE DATA ONLY. RPC answers for the league-night mocks, by function name. Each gets (JSON body, { user }).
// Names not listed here go on to the standings mock (get_head_to_head_records, get_batch_head_to_head,
// get_blind_draw_signup_count), then to the tool, which aborts the call.
import { base, teams } from './data.mjs';

const nameOf = (id) => teams.find((t) => t.team_id === id)?.name ?? 'Fake Team';

const BACKED_UP = '2026-08-09T12:00:00Z';
const seasonName = (id) => base.seasons.find((s) => s.id === id)?.name ?? null;
export const RPC = {
  is_username_taken: () => false,
  // Newest first: the default weights (40/45/15; admins can change them, see docs/agents/LEAGUE_CONTEXT.md) and the triple a revert restores.
  get_power_score_weights: () => [
    { id: 2, win_weight: 40, sos_weight: 45, game_weight: 15, applied_at: '2026-08-20T12:00:00Z', note: 'Fake note: default weights' },
    { id: 1, win_weight: 40, sos_weight: 40, game_weight: 20, applied_at: '2026-01-01T00:00:00Z', note: null },
  ],
  // Power migration: unified formula applied, backup kept. The "before" numbers are the live ones nudged a little.
  admin_power_unification_status: () => [{ status: 'applied', backed_up_at: BACKED_UP, backup_season_rows: base.team_season_stats.length, backup_team_rows: teams.length, live_season_rows: base.team_season_stats.length }],
  admin_get_pre_unification_season_stats: () => base.team_season_stats.map(({ seasons, career_power_score, ...row }, k) => ({
    ...row, power_score: Number((row.power_score - 0.02 + (k % 5) * 0.01).toFixed(3)), recorded_at: BACKED_UP, backed_up_at: BACKED_UP, season_name: seasonName(row.season_id),
  })),
  admin_get_pre_unification_team_power: () => teams.map((t, k) => ({
    team_id: t.team_id, power_score: Number((t.power_score - 2 + (k % 4)).toFixed(1)), wins: t.wins, losses: t.losses, game_wins: t.game_wins,
    game_losses: t.game_losses, win_percentage: t.win_percentage, game_win_percentage: t.game_win_percentage, backed_up_at: BACKED_UP,
  })),
  // Compare page and opponent history pop-up: three fake past meetings of any two teams, newest first.
  get_opponent_match_history: ({ p_team_id: a, p_opponent_id: b }) => [
    ['2026-10-22', 2, 1, a], ['2026-09-17', 0, 2, b], ['2026-08-27', 2, 0, a],
  ].map(([date, w1, w2, winner], k) => ({
    id: `00000000-0000-4000-8000-0000000097${String(k).padStart(2, '0')}`, date: `${date}T22:30:00+00:00`, location: 'Fake Hall, court 2',
    team1_id: a, team1_name: nameOf(a), team2_id: b, team2_name: nameOf(b), team1_game_wins: w1, team2_game_wins: w2,
    team1_score: w1, team2_score: w2, winner_id: winner, winner_name: nameOf(winner),
  })),
};
