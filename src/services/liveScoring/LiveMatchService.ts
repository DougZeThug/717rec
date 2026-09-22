import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { LiveScoringNotEnabledError, ValidationError } from '@/types/errors';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import { MAX_PLAYERS_PER_SIDE } from '@/utils/liveScoring/rules';
type GamePlayerRow = Tables<'game_players'>;
type LiveGameRow = Tables<'games'>;
type MatchRoundRow = Tables<'match_rounds'>;

export const GAME_COLUMNS =
  'id, match_id, game_number, team1_score, team2_score, status, winner_team_id, started_at, completed_at, created_at, updated_at';

// Single literal (not concatenated) so PostgREST result typing can parse it.
export const ROUND_COLUMNS =
  'id, match_id, game_id, round_number, team1_score, team2_score, net_points, winner_team, team1_thrower_id, team2_thrower_id, team1_bags_in, team1_bags_on, team1_bags_off, team2_bags_in, team2_bags_on, team2_bags_off, entered_by_user_id, created_at';

const GAME_PLAYER_COLUMNS = 'id, game_id, team_id, player_id, slot, created_at';

interface LiveMatchTeamInfo {
  id: string;
  name: string;
  logo_url: string | null;
  image_url: string | null;
}

interface LiveMatchInfo {
  id: string;
  season_id: string | null;
  date: string;
  location: string | null;
  best_of: number | null;
  iscompleted: boolean | null;
  winner_id: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_game_wins: number | null;
  team2_game_wins: number | null;
  team1: LiveMatchTeamInfo | null;
  team2: LiveMatchTeamInfo | null;
}

export interface LiveMatchBundle {
  match: LiveMatchInfo;
  games: LiveGameRow[];
  rounds: MatchRoundRow[];
  gamePlayers: GamePlayerRow[];
}

/**
 * Live-scoring tables are created by an out-of-band migration; until it is
 * applied, PostgREST reports 42P01 (relation does not exist). Surface that as
 * a typed "not enabled" error so the UI can degrade gracefully.
 */
// PGRST205/PGRST202: PostgREST schema-cache miss for a table/function (what
// the live API actually returns pre-migration). 42P01: undefined relation at
// the Postgres level (e.g. surfaced through an RPC).
const NOT_ENABLED_CODES = ['PGRST205', 'PGRST202', '42P01'];

/** Map "live scoring tables not migrated yet" error codes to LiveScoringNotEnabledError; delegate everything else to handleDatabaseError. */
export function handleLiveScoringError(error: PostgrestError, context: string): never {
  if (NOT_ENABLED_CODES.includes(error.code)) {
    throw new LiveScoringNotEnabledError();
  }
  handleDatabaseError(error, context);
}

interface StartGameWithRosterArgs {
  p_match_id: string;
  p_game_number: number;
  p_team1_id: string;
  p_team1_player_ids: string[];
  p_team2_id: string;
  p_team2_player_ids: string[];
}

/**
 * Calls start_game_with_roster through a narrowed signature.
 *
 * `types.ts` is generated from the live database and must not be hand-edited,
 * so it does not know this function until the migration is applied and the
 * types are regenerated -- see the runbook in `docs/OPERATIONS.md`. Without
 * this, `npm run typecheck` fails on a call that is perfectly valid at runtime
 * and CI stays red for as long as the migration is unapplied.
 *
 * REMOVE THIS once the types carry the function: delete the cast and this
 * interface and call `supabase.rpc('start_game_with_roster', { ... })`
 * directly. It lives here rather than in a declaration-merging file because
 * `Database` is a type alias, not an interface, so it cannot be augmented.
 *
 * The argument names are still checked, against the interface above. Only the
 * function name goes unchecked, and PostgREST checks that at runtime -- a
 * wrong one comes back as PGRST202, which handleLiveScoringError already maps
 * to LiveScoringNotEnabledError.
 */
const callStartGameWithRoster = (args: StartGameWithRosterArgs) =>
  (
    supabase.rpc as unknown as (
      fn: 'start_game_with_roster',
      rpcArgs: StartGameWithRosterArgs
    ) => Promise<{ data: unknown; error: PostgrestError | null }>
  )('start_game_with_roster', args);

export const LiveMatchService = {
  fetchLiveMatchBundle: async (matchId: string): Promise<LiveMatchBundle> => {
    const [matchResult, gamesResult, roundsResult] = await Promise.all([
      supabase
        .from('matches')
        .select(
          `id, season_id, date, location, best_of, iscompleted, winner_id,
           team1_id, team2_id, team1_game_wins, team2_game_wins,
           team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
           team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)`
        )
        .eq('id', matchId)
        .maybeSingle(),
      supabase
        .from('games')
        .select(GAME_COLUMNS)
        .eq('match_id', matchId)
        .order('game_number', { ascending: true }),
      supabase
        .from('match_rounds')
        .select(ROUND_COLUMNS)
        .eq('match_id', matchId)
        .order('round_number', { ascending: true }),
    ]);

    if (matchResult.error) handleDatabaseError(matchResult.error, 'Failed to fetch match');
    // The legacy games table exists even before the live-scoring migration, so
    // "not enabled" is detected on the new match_rounds table.
    if (gamesResult.error) handleLiveScoringError(gamesResult.error, 'Failed to fetch games');
    if (roundsResult.error) handleLiveScoringError(roundsResult.error, 'Failed to fetch rounds');

    const match = ensureFound(matchResult.data, 'Match', matchId);
    const games = gamesResult.data ?? [];

    let gamePlayers: GamePlayerRow[] = [];
    if (games.length > 0) {
      const { data, error } = await supabase
        .from('game_players')
        .select(GAME_PLAYER_COLUMNS)
        .in(
          'game_id',
          games.map((g) => g.id)
        )
        .order('slot', { ascending: true });
      if (error) handleLiveScoringError(error, 'Failed to fetch game players');
      gamePlayers = data ?? [];
    }

    return {
      match: match as unknown as LiveMatchInfo,
      games,
      rounds: roundsResult.data ?? [],
      gamePlayers,
    };
  },

  /** Idempotent: a concurrent create of the same game number returns the existing row. */
  createGame: async (matchId: string, gameNumber: number): Promise<LiveGameRow> => {
    const { data, error } = await supabase
      .from('games')
      .insert({ match_id: matchId, game_number: gameNumber })
      .select(GAME_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('games')
          .select(GAME_COLUMNS)
          .eq('match_id', matchId)
          .eq('game_number', gameNumber)
          .single();
        if (fetchError) handleLiveScoringError(fetchError, 'Failed to load existing game');
        return ensureFound(existing, 'Game');
      }
      handleLiveScoringError(error, 'Failed to create game');
    }
    return ensureFound(data, 'Game');
  },

  completeGame: async (
    gameId: string,
    winnerTeamId: string,
    finalTotals: { team1: number; team2: number }
  ): Promise<void> => {
    const { error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_team_id: winnerTeamId,
        team1_score: finalTotals.team1,
        team2_score: finalTotals.team2,
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (error) handleLiveScoringError(error, 'Failed to complete game');
  },

  reopenGame: async (gameId: string): Promise<void> => {
    const { error } = await supabase
      .from('games')
      .update({ status: 'in_progress', winner_team_id: null, completed_at: null })
      .eq('id', gameId);

    if (error) handleLiveScoringError(error, 'Failed to reopen game');
  },

  /**
   * Create the game and write both line-ups in one database transaction.
   *
   * Replaces a createGame plus two setGamePlayers calls that had nothing
   * wrapping them: one failed line-up write left a committed in-progress game
   * with only the other side rostered, and no rollback. Idempotent on
   * (match_id, game_number), so a retry or a second scorer lands in the same
   * game and replaces the line-ups rather than duplicating them.
   */
  startGameWithRoster: async (
    matchId: string,
    gameNumber: number,
    team1Id: string,
    team1PlayerIds: string[],
    team2Id: string,
    team2PlayerIds: string[]
  ): Promise<LiveGameRow> => {
    if (
      team1PlayerIds.length > MAX_PLAYERS_PER_SIDE ||
      team2PlayerIds.length > MAX_PLAYERS_PER_SIDE
    ) {
      throw new ValidationError(
        `A team can select at most ${MAX_PLAYERS_PER_SIDE} players per game`
      );
    }

    const { data, error } = await callStartGameWithRoster({
      p_match_id: matchId,
      p_game_number: gameNumber,
      p_team1_id: team1Id,
      p_team1_player_ids: team1PlayerIds,
      p_team2_id: team2Id,
      p_team2_player_ids: team2PlayerIds,
    });

    if (error) handleLiveScoringError(error, 'Failed to start game');

    const result = (data ?? {}) as Record<string, unknown>;
    const gameId = typeof result.game_id === 'string' ? result.game_id : null;
    const startedGameId = ensureFound(gameId, 'Game');

    // The caller needs the whole row and the function returns only the id, so
    // read it back. The transaction has committed by this point.
    const { data: game, error: fetchError } = await supabase
      .from('games')
      .select(GAME_COLUMNS)
      .eq('id', startedGameId)
      .maybeSingle();

    if (fetchError) handleLiveScoringError(fetchError, 'Failed to load the started game');
    return ensureFound(game, 'Game', startedGameId);
  },
};
