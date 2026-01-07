/**
 * Centralized match transformation utilities
 * Consolidates all database-to-app format conversions for Match and PlayoffMatch types
 */

import { Match, PlayoffMatch, PlayoffGame } from "@/types";
import { normalizeDateWithTime } from "./dateNormalization";

// ============= Type Definitions =============

export interface TransformMatchOptions {
  /** Whether to normalize the date using normalizeDateWithTime (default: true) */
  normalizeDate?: boolean;
  /** Logging context for date normalization */
  context?: string;
}

// ============= Helper Functions =============

/**
 * Extract team details from nested join results (handles array or object format)
 */
function extractTeamDetails(team: any): Match['team1Details'] {
  if (!team) return null;
  const t = Array.isArray(team) ? team[0] : team;
  if (!t) return null;
  
  return {
    team_id: t.team_id || t.id,
    name: t.name,
    image_url: t.image_url ?? null,
    logo_url: t.logo_url ?? null,
    divisionName: t.divisionname ?? t.divisionName ?? null
  };
}

/**
 * Extract team data for playoff matches
 */
function extractPlayoffTeam(team: any): { id: string; name: string; logo_url: string | null } | undefined {
  if (!team) return undefined;
  return {
    id: team.id,
    name: team.name,
    logo_url: team.logo_url || team.image_url || null
  };
}

/**
 * Transform a playoff game row to PlayoffGame format
 */
function transformPlayoffGame(game: any): PlayoffGame {
  return {
    id: game.id,
    matchId: game.match_id,
    gameNumber: game.game_number,
    team1Score: game.team1_score,
    team2Score: game.team2_score,
    winnerId: game.winner_id,
    winner: game.winner_id
  };
}

// ============= Main Transform Functions =============

/**
 * Transform a database match row to application Match format
 * 
 * @param match - Raw database row from 'matches' table
 * @param options - Transform options
 * @returns Transformed Match object
 */
export function transformDatabaseMatch(
  match: any,
  options: TransformMatchOptions = {}
): Match {
  const { normalizeDate = true, context } = options;
  
  // Handle date - use normalizeDateWithTime if enabled, otherwise fallback
  const date = normalizeDate && match.date 
    ? normalizeDateWithTime(match.date, context || `transformDatabaseMatch(${match.id})`)
    : match.date || match.created_at || undefined;

  return {
    id: match.id,
    team1Id: match.team1_id || '',
    team2Id: match.team2_id || '',
    team1Score: match.team1_score ?? undefined,
    team2Score: match.team2_score ?? undefined,
    date,
    location: match.location || '',
    iscompleted: match.iscompleted ?? false,
    winnerId: match.winner_id ?? undefined,
    loserId: match.loser_id ?? undefined,
    round_number: match.round_number ?? undefined,
    position: match.position ?? undefined,
    bracket_id: match.bracket_id ?? undefined,
    match_type: match.match_type ?? undefined,
    next_match_id: match.next_match_id ?? undefined,
    next_loser_match_id: match.next_loser_match_id ?? undefined,
    best_of: match.best_of ?? undefined,
    team1_game_wins: match.team1_game_wins ?? undefined,
    team2_game_wins: match.team2_game_wins ?? undefined,
    created_at: match.created_at ?? undefined,
    // Include team details if present in the join
    team1Details: extractTeamDetails(match.team1),
    team2Details: extractTeamDetails(match.team2)
  };
}

/**
 * Transform multiple database match rows to Match array
 */
export function transformDatabaseMatches(
  matches: any[],
  options?: TransformMatchOptions
): Match[] {
  if (!matches) return [];
  return matches.map(m => transformDatabaseMatch(m, options));
}

/**
 * Transform a database playoff match row to application PlayoffMatch format
 * 
 * @param match - Raw database row from 'playoff_matches' table
 * @returns Transformed PlayoffMatch object
 */
export function transformDatabasePlayoffMatch(match: any): PlayoffMatch {
  const games = match.playoff_games || [];
  
  // Calculate game wins from games array
  const team1GameWins = games.filter((g: any) => g.winner_id === match.team1_id).length;
  const team2GameWins = games.filter((g: any) => g.winner_id === match.team2_id).length;

  return {
    id: match.id,
    bracket_id: match.bracket_id || '',
    round: match.round ?? 0,
    position: match.position ?? 0,
    team1Id: match.team1_id ?? null,
    team2Id: match.team2_id ?? null,
    winnerId: match.winner_id ?? null,
    loserId: match.loser_id ?? null,
    team1Score: match.team1_score ?? null,
    team2Score: match.team2_score ?? null,
    team1GameWins: team1GameWins || match.team1_game_wins || 0,
    team2GameWins: team2GameWins || match.team2_game_wins || 0,
    matchType: match.match_type ?? 'winners',
    bestOf: match.best_of ?? 3,
    team1Seed: match.team1_seed ?? null,
    team2Seed: match.team2_seed ?? null,
    nextWinMatchId: match.next_win_match_id ?? match.next_match_id ?? null,
    nextLoseMatchId: match.next_lose_match_id ?? match.next_loser_match_id ?? null,
    status: match.status || (match.iscompleted ? 'completed' : 'pending'),
    games: games.map(transformPlayoffGame)
  };
}

/**
 * Transform multiple database playoff match rows to PlayoffMatch array
 */
export function transformDatabasePlayoffMatches(matches: any[]): PlayoffMatch[] {
  if (!matches) return [];
  return matches.map(transformDatabasePlayoffMatch);
}

/**
 * Transform a realtime payload to PlayoffMatch format (minimal fields from realtime update)
 */
export function transformRealtimePlayoffMatch(payload: any): PlayoffMatch {
  return {
    id: payload.id,
    bracket_id: payload.bracket_id || '',
    round: payload.round ?? 0,
    position: payload.position ?? 0,
    team1Id: payload.team1_id ?? null,
    team2Id: payload.team2_id ?? null,
    winnerId: payload.winner_id ?? null,
    loserId: payload.loser_id ?? null,
    team1Score: payload.team1_score ?? null,
    team2Score: payload.team2_score ?? null,
    team1GameWins: payload.team1_game_wins ?? 0,
    team2GameWins: payload.team2_game_wins ?? 0,
    matchType: payload.match_type ?? 'winners',
    bestOf: payload.best_of ?? 3,
    team1Seed: payload.team1_seed ?? null,
    team2Seed: payload.team2_seed ?? null,
    nextWinMatchId: payload.next_win_match_id ?? null,
    nextLoseMatchId: payload.next_lose_match_id ?? null,
    status: payload.status || 'pending',
    games: []
  };
}

// ============= Extended Types for Hooks with Team Data =============

/**
 * PlayoffMatch with embedded team data (for hooks that need team names/logos)
 */
export interface PlayoffMatchWithTeams extends PlayoffMatch {
  team1?: { id: string; name: string; logo_url: string | null };
  team2?: { id: string; name: string; logo_url: string | null };
}

/**
 * Transform database playoff match with team data included
 */
export function transformDatabasePlayoffMatchWithTeams(match: any): PlayoffMatchWithTeams {
  const baseMatch = transformDatabasePlayoffMatch(match);
  
  return {
    ...baseMatch,
    team1: extractPlayoffTeam(match.team1),
    team2: extractPlayoffTeam(match.team2)
  };
}

/**
 * Transform multiple database playoff matches with team data
 */
export function transformDatabasePlayoffMatchesWithTeams(matches: any[]): PlayoffMatchWithTeams[] {
  if (!matches) return [];
  return matches.map(transformDatabasePlayoffMatchWithTeams);
}
