import { supabase } from '@/integrations/supabase/client';
import { ensureFound, handleDatabaseError } from '@/utils/errorHandler';
import {
  transformDatabasePlayoffMatchesWithTeams,
  type PlayoffMatchWithTeams,
} from '@/utils/matchTransformers';
import type {
  BracketManagerMatchWithStage,
  LegacyPlayoffMatchWithGames,
} from './types';

/**
 * Fetch playoff matches for a bracket with team data
 * Used by usePlayoffMatches hook
 */
export const fetchPlayoffMatches = async (bracketId: string): Promise<PlayoffMatchWithTeams[]> => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select(
      `
      id, bracket_id, round, position, match_type, best_of, status,
      team1_id, team2_id, team1_score, team2_score, winner_id, loser_id,
      team1_seed, team2_seed, next_win_match_id, next_lose_match_id, created_at, updated_at,
      team1:teams!fk_playoff_matches_team1(id, name, logo_url, image_url),
      team2:teams!fk_playoff_matches_team2(id, name, logo_url, image_url),
      playoff_games(id, match_id, game_number, team1_score, team2_score, winner_id)
    `
    )
    .eq('bracket_id', bracketId)
    .order('round')
    .order('position');

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff matches');
  }

  if (!data || data.length === 0) return [];

  return transformDatabasePlayoffMatchesWithTeams(data);
};

/**
 * Fetch a brackets-manager match with its stage data
 * Used by usePlayoffEditMatch hook (integer matchId path)
 */
export const fetchBmMatchWithStage = async (
  matchId: number
): Promise<BracketManagerMatchWithStage | null> => {
  const { data, error } = await supabase
    .from('match')
    .select(
      'id, stage_id, group_id, round_id, number, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result, child_count, stage:stage!fk_match_stage(id, name, type, tournament_id, number, settings)'
    )
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets-manager match');
  }

  return data;
};

/**
 * Fetch a legacy playoff match with bracket info and games
 * Used by usePlayoffEditMatch hook (UUID matchId path)
 */
export const fetchPlayoffMatchWithBracket = async (
  matchId: string
): Promise<LegacyPlayoffMatchWithGames | null> => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select(
      `
      id, bracket_id, round, position, match_type, best_of, status,
      team1_id, team2_id, team1_score, team2_score, winner_id, loser_id,
      team1_seed, team2_seed, next_win_match_id, next_lose_match_id,
      bracket:brackets!playoff_matches_bracket_id_fkey(id, uses_brackets_manager),
      playoff_games(id, match_id, game_number, team1_score, team2_score, winner_id)
    `
    )
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff match with bracket');
  }

  return data;
};

/**
 * Fetch brackets-manager match opponent and stage data
 * Used by usePlayoffMatchUpdate hook (BM path)
 */
export const fetchBmMatchData = async (
  matchId: number
): Promise<{ opponent1_id: number | null; opponent2_id: number | null; stage_id: number } | null> => {
  const { data, error } = await supabase
    .from('match')
    .select('opponent1_id, opponent2_id, stage_id')
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch brackets-manager match data');
  }

  return data;
};

/**
 * Fetch a legacy playoff match's team IDs for score update
 * Used by usePlayoffMatchUpdate hook (legacy path)
 */
export const fetchPlayoffMatchTeams = async (matchId: string) => {
  const { data, error } = await supabase
    .from('playoff_matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (error) {
    handleDatabaseError(error, 'Failed to fetch playoff match team data');
  }

  return data;
};

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
