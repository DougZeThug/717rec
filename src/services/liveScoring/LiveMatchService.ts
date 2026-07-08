import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { LiveScoringNotEnabledError } from '@/types/errors';
import { handleDatabaseError, ensureFound } from '@/utils/errorHandler';
import { MAX_PLAYERS_PER_SIDE } from '@/utils/liveScoring/rules';

import type { GamePlayerRow, LiveGameRow, MatchRoundRow } from './dbTypes';
import { liveDb } from './liveDb';

export const GAME_COLUMNS =
  'id, match_id, game_number, team1_score, team2_score, status, winner_team_id, started_at, completed_at, created_at, updated_at';

// Single literal (not concatenated) so PostgREST result typing can parse it.
export const ROUND_COLUMNS =
  'id, match_id, game_id, round_number, team1_score, team2_score, net_points, winner_team, team1_thrower_id, team2_thrower_id, team1_bags_in, team1_bags_on, team1_bags_off, team2_bags_in, team2_bags_on, team2_bags_off, entered_by_user_id, created_at';

const GAME_PLAYER_COLUMNS = 'id, game_id, team_id, player_id, slot, created_at';

export interface LiveMatchTeamInfo {
  id: string;
  name: string;
  logo_url: string | null;
  image_url: string | null;
}

export interface LiveMatchInfo {
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
export function handleLiveScoringError(error: PostgrestError, context: string): never {
  if (error.code === '42P01') {
    throw new LiveScoringNotEnabledError();
  }
  handleDatabaseError(error, context);
}

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
      liveDb
        .from('games')
        .select(GAME_COLUMNS)
        .eq('match_id', matchId)
        .order('game_number', { ascending: true }),
      liveDb
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
      const { data, error } = await liveDb
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
    const { data, error } = await liveDb
      .from('games')
      .insert({ match_id: matchId, game_number: gameNumber })
      .select(GAME_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await liveDb
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
    const { error } = await liveDb
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
    const { error } = await liveDb
      .from('games')
      .update({ status: 'in_progress', winner_team_id: null, completed_at: null })
      .eq('id', gameId);

    if (error) handleLiveScoringError(error, 'Failed to reopen game');
  },

  /** Replace one side's player selection for a game (max 2 slots). */
  setGamePlayers: async (gameId: string, teamId: string, playerIds: string[]): Promise<void> => {
    if (playerIds.length > MAX_PLAYERS_PER_SIDE) {
      throw new Error(`A team can select at most ${MAX_PLAYERS_PER_SIDE} players per game`);
    }

    const { error: deleteError } = await liveDb
      .from('game_players')
      .delete()
      .eq('game_id', gameId)
      .eq('team_id', teamId);
    if (deleteError) handleLiveScoringError(deleteError, 'Failed to clear game players');

    if (playerIds.length === 0) return;

    const { error: insertError } = await liveDb.from('game_players').insert(
      playerIds.map((playerId, index) => ({
        game_id: gameId,
        team_id: teamId,
        player_id: playerId,
        slot: index + 1,
      }))
    );
    if (insertError) handleLiveScoringError(insertError, 'Failed to save game players');
  },
};
