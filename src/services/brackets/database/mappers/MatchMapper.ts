
import { DatabasePlayoffMatch } from '../types/DatabaseTypes';
import { PlayoffMatch } from '@/types';

/**
 * Convert database row to runtime type
 */
export const toRuntime = (r: DatabasePlayoffMatch): PlayoffMatch => ({
  id: r.id,
  bracket_id: r.bracket_id,
  round: r.round,
  position: r.position,
  matchType: r.match_type,
  team1Id: r.team1_id,
  team2Id: r.team2_id,
  team1Score: r.team1_score,
  team2Score: r.team2_score,
  team1GameWins: r.team1_game_wins,
  team2GameWins: r.team2_game_wins,
  team1Seed: r.team1_seed,
  team2Seed: r.team2_seed,
  winnerId: r.winner_id,
  loserId: r.loser_id,
  nextWinMatchId: r.next_win_match_id,
  nextLoseMatchId: r.next_lose_match_id,
  bestOf: r.best_of || 3,
  status: r.status
});

/**
 * Convert runtime type to database row
 */
export const toRow = (m: PlayoffMatch): DatabasePlayoffMatch => ({
  id: m.id,
  bracket_id: m.bracket_id,
  round: m.round,
  position: m.position,
  match_type: m.matchType,
  team1_id: m.team1Id,
  team2_id: m.team2Id,
  team1_score: m.team1Score,
  team2_score: m.team2Score,
  team1_game_wins: m.team1GameWins,
  team2_game_wins: m.team2GameWins,
  team1_seed: m.team1Seed,
  team2_seed: m.team2Seed,
  winner_id: m.winnerId,
  loser_id: m.loserId,
  next_win_match_id: m.nextWinMatchId,
  next_lose_match_id: m.nextLoseMatchId,
  best_of: m.bestOf,
  status: m.status
});
