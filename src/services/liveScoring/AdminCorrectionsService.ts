import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { validateBreakdown } from '@/utils/liveScoring/bagBreakdown';
import { isValidRoundScore } from '@/utils/liveScoring/scoring';
import type { BagBreakdown } from '@/utils/liveScoring/types';

import { GAME_COLUMNS, handleLiveScoringError, ROUND_COLUMNS } from './LiveMatchService';

type MatchRoundRow = Tables<'match_rounds'>;
type LiveGameRow = Tables<'games'>;

export interface UpdateRoundPatch {
  team1Score?: number;
  team2Score?: number;
  team1ThrowerId?: string | null;
  team2ThrowerId?: string | null;
  team1Bags?: BagBreakdown | null;
  team2Bags?: BagBreakdown | null;
}

export interface AdminLiveScoredMatch {
  id: string;
  date: string | null;
  location: string | null;
  iscompleted: boolean | null;
  winner_id: string | null;
  season_id: string | null;
  team1: { id: string; name: string } | null;
  team2: { id: string; name: string } | null;
  gameCount: number;
  roundCount: number;
}

// Single literals (not concatenated) so PostgREST result typing can parse them.
// match_rounds and games each have more than one relationship reaching matches,
// so the foreign key is named explicitly.
const ROUND_MATCH_COLUMNS = 'id, match:matches!match_rounds_match_id_fkey(season_id)';
const GAME_MATCH_COLUMNS = 'id, match:matches!games_match_id_fkey(season_id)';

type EmbeddedMatch = { season_id: string | null } | null;

/**
 * B-20: an archived season is frozen. The power score machinery already refuses
 * to recompute one (`upsert_team_season_stats`), but nothing stopped these three
 * writes from editing the rounds those numbers are derived from.
 *
 * The refusal lives here rather than only in the panel so it holds for any
 * caller. It costs one extra read per write, which is nothing on an operation an
 * admin performs by hand a few times a season.
 *
 * A null season id means the match belongs to no season, which no freeze covers,
 * so the write is allowed.
 */
const assertSeasonEditable = async (seasonId: string | null | undefined): Promise<void> => {
  if (!seasonId) return;

  const { data, error } = await supabase
    .from('seasons')
    .select('id, name, is_archived')
    .eq('id', seasonId)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to check whether the season is archived');
  if (data?.is_archived) {
    throw new BusinessLogicError(
      `${data.name} is archived. An archived season's rounds are frozen and cannot be corrected.`
    );
  }
};

/** Season of the match a round belongs to. Null when the round is already gone. */
const seasonIdForRound = async (roundId: string): Promise<string | null | undefined> => {
  const { data, error } = await supabase
    .from('match_rounds')
    .select(ROUND_MATCH_COLUMNS)
    .eq('id', roundId)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to read the round');
  return (data?.match as EmbeddedMatch)?.season_id;
};

/** Season of the match a game belongs to. Null when the game is already gone. */
const seasonIdForGame = async (gameId: string): Promise<string | null | undefined> => {
  const { data, error } = await supabase
    .from('games')
    .select(GAME_MATCH_COLUMNS)
    .eq('id', gameId)
    .maybeSingle();

  if (error) handleDatabaseError(error, 'Failed to read the game');
  return (data?.match as EmbeddedMatch)?.season_id;
};

/**
 * Admin-only correction operations for live-scored matches. RLS already
 * restricts these writes to admins on match_rounds (any row) and games.
 */
export const AdminCorrectionsService = {
  updateRound: async (roundId: string, patch: UpdateRoundPatch): Promise<MatchRoundRow> => {
    if (patch.team1Score !== undefined && !isValidRoundScore(patch.team1Score)) {
      throw new ValidationError('Team 1 score must be 0-12 (11 is not possible in cornhole)');
    }
    if (patch.team2Score !== undefined && !isValidRoundScore(patch.team2Score)) {
      throw new ValidationError('Team 2 score must be 0-12 (11 is not possible in cornhole)');
    }
    if (
      patch.team1Bags &&
      patch.team1Score !== undefined &&
      !validateBreakdown(patch.team1Score, patch.team1Bags)
    ) {
      throw new ValidationError('Team 1 bag breakdown does not match the round score');
    }
    if (
      patch.team2Bags &&
      patch.team2Score !== undefined &&
      !validateBreakdown(patch.team2Score, patch.team2Bags)
    ) {
      throw new ValidationError('Team 2 bag breakdown does not match the round score');
    }

    const update: Partial<MatchRoundRow> = {};
    if (patch.team1Score !== undefined) update.team1_score = patch.team1Score;
    if (patch.team2Score !== undefined) update.team2_score = patch.team2Score;
    if (patch.team1ThrowerId !== undefined) update.team1_thrower_id = patch.team1ThrowerId;
    if (patch.team2ThrowerId !== undefined) update.team2_thrower_id = patch.team2ThrowerId;
    if (patch.team1Bags !== undefined) {
      update.team1_bags_in = patch.team1Bags?.bagsIn ?? null;
      update.team1_bags_on = patch.team1Bags?.bagsOn ?? null;
      update.team1_bags_off = patch.team1Bags?.bagsOff ?? null;
    }
    if (patch.team2Bags !== undefined) {
      update.team2_bags_in = patch.team2Bags?.bagsIn ?? null;
      update.team2_bags_on = patch.team2Bags?.bagsOn ?? null;
      update.team2_bags_off = patch.team2Bags?.bagsOff ?? null;
    }

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No changes to save');
    }

    await assertSeasonEditable(await seasonIdForRound(roundId));

    const { data, error } = await supabase
      .from('match_rounds')
      .update(update)
      .eq('id', roundId)
      .select(ROUND_COLUMNS)
      .single();

    if (error) handleLiveScoringError(error, 'Failed to update round');
    if (!data) throw new ValidationError('Round update returned no data');
    return data;
  },

  deleteRound: async (roundId: string): Promise<void> => {
    await assertSeasonEditable(await seasonIdForRound(roundId));

    const { error } = await supabase.from('match_rounds').delete().eq('id', roundId);
    if (error) handleLiveScoringError(error, 'Failed to delete round');
  },

  setGameWinner: async (
    gameId: string,
    winnerTeamId: string,
    finalTotals: { team1: number; team2: number }
  ): Promise<LiveGameRow> => {
    await assertSeasonEditable(await seasonIdForGame(gameId));

    const { data, error } = await supabase
      .from('games')
      .update({
        winner_team_id: winnerTeamId,
        team1_score: finalTotals.team1,
        team2_score: finalTotals.team2,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .select(GAME_COLUMNS)
      .single();

    if (error) handleLiveScoringError(error, 'Failed to change game winner');
    if (!data) throw new ValidationError('Game update returned no data');
    return data;
  },

  /**
   * Lists all matches with ≥1 live-scoring game row, optionally scoped to a
   * season. Returns joined team names + a count of games/rounds for the
   * corrections picker.
   */
  listLiveScoredMatches: async (seasonId?: string | null): Promise<AdminLiveScoredMatch[]> => {
    // Step 1: find matches that have live-scoring games.
    const gamesQuery = supabase.from('games').select('match_id');
    const { data: gameRows, error: gamesError } = await gamesQuery;
    if (gamesError) handleDatabaseError(gamesError, 'Failed to list live-scored matches');

    const matchIds = Array.from(
      new Set((gameRows ?? []).map((r) => r.match_id).filter((v): v is string => !!v))
    );
    if (matchIds.length === 0) return [];

    // Step 2: fetch match rows joined with team names.
    let matchQuery = supabase
      .from('matches')
      .select(
        `id, date, location, iscompleted, winner_id, season_id,
         team1:teams!matches_team1_id_fkey(id, name),
         team2:teams!matches_team2_id_fkey(id, name)`
      )
      .in('id', matchIds)
      .order('date', { ascending: false });

    if (seasonId) matchQuery = matchQuery.eq('season_id', seasonId);

    const { data: matchRows, error: matchError } = await matchQuery;
    if (matchError) handleDatabaseError(matchError, 'Failed to fetch live-scored matches');

    // Step 3: counts.
    const gameCounts = new Map<string, number>();
    for (const g of gameRows ?? []) {
      if (g.match_id) gameCounts.set(g.match_id, (gameCounts.get(g.match_id) ?? 0) + 1);
    }

    const filteredIds = (matchRows ?? []).map((m) => m.id);
    const roundCounts = new Map<string, number>();
    if (filteredIds.length > 0) {
      const { data: roundRows, error: roundError } = await supabase
        .from('match_rounds')
        .select('match_id')
        .in('match_id', filteredIds);
      if (roundError) handleDatabaseError(roundError, 'Failed to count rounds');
      for (const r of roundRows ?? []) {
        if (r.match_id) roundCounts.set(r.match_id, (roundCounts.get(r.match_id) ?? 0) + 1);
      }
    }

    return (matchRows ?? []).map((m) => ({
      id: m.id,
      date: m.date,
      location: m.location,
      iscompleted: m.iscompleted,
      winner_id: m.winner_id,
      season_id: m.season_id,
      team1: m.team1 as { id: string; name: string } | null,
      team2: m.team2 as { id: string; name: string } | null,
      gameCount: gameCounts.get(m.id) ?? 0,
      roundCount: roundCounts.get(m.id) ?? 0,
    }));
  },
};
