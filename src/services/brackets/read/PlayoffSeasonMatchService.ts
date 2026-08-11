import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * A completed playoff match, normalized so it can sit alongside regular-season
 * matches in season-wide stats (streaks, upsets, rankings).
 *
 * Note on scores: `playoff_matches.team1_score` / `team2_score` hold GAME WINS
 * (e.g. 2-1 in a best-of-3), which is the same unit as
 * `matches.team1_game_wins` / `team2_game_wins` — not point totals.
 */
export interface SeasonPlayoffMatch {
  id: string;
  bracketId: string;
  team1Id: string;
  team2Id: string;
  winnerId: string;
  loserId: string | null;
  team1GameWins: number | null;
  team2GameWins: number | null;
  team1Seed: number | null;
  team2Seed: number | null;
  round: number;
  position: number;
  matchType: string;
  /** When the result was recorded: updated_at, falling back to created_at. */
  recordedAt: string | null;
}

/**
 * Fetches every completed playoff match for a season, across all of its brackets.
 *
 * Byes are excluded. A bye is stored as a row with a winner but no opponent
 * (`team2_id` null), and counting one would hand the team a free win.
 *
 * Returns an empty array when the season has no brackets yet — that is a valid
 * "no data" state, not an error.
 */
export const fetchCompletedPlayoffMatchesForSeason = async (
  seasonId: string
): Promise<SeasonPlayoffMatch[]> => {
  // Season is resolved via brackets rather than a PostgREST embed filter, matching
  // how every other playoff-by-season read in this codebase is written.
  const { data: brackets, error: bracketError } = await supabase
    .from('brackets')
    .select('id')
    .eq('season_id', seasonId);

  if (bracketError) {
    handleDatabaseError(bracketError, 'Failed to fetch brackets for season playoff matches');
  }

  const bracketIds = (brackets ?? []).map((b) => b.id);
  if (bracketIds.length === 0) return [];

  const { data, error } = await supabase
    .from('playoff_matches')
    .select(
      'id, bracket_id, round, position, match_type, team1_id, team2_id, team1_score, team2_score, team1_seed, team2_seed, winner_id, loser_id, created_at, updated_at'
    )
    .in('bracket_id', bracketIds)
    .not('winner_id', 'is', null)
    .not('team1_id', 'is', null)
    .not('team2_id', 'is', null)
    .order('round')
    .order('position');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch completed playoff matches');
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    bracketId: row.bracket_id as string,
    team1Id: row.team1_id as string,
    team2Id: row.team2_id as string,
    winnerId: row.winner_id as string,
    loserId: row.loser_id,
    team1GameWins: row.team1_score,
    team2GameWins: row.team2_score,
    team1Seed: row.team1_seed,
    team2Seed: row.team2_seed,
    round: row.round,
    position: row.position,
    matchType: row.match_type,
    recordedAt: row.updated_at ?? row.created_at,
  }));
};
