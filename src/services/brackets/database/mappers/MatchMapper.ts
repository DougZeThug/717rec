
import { PlayoffMatch } from "@/types/playoffs";
import { DatabasePlayoffMatch } from "../types/DatabaseTypes";

/**
 * Convert database row to runtime model
 */
export function toRuntime(r: DatabasePlayoffMatch): PlayoffMatch {
  return {
    id: r.id,
    bracket_id: r.bracket_id,
    round: r.round,
    position: r.position,
    matchType: r.match_type,
    team1Id: r.team1_id,
    team2Id: r.team2_id,
    team1Score: r.team1_score,
    team2Score: r.team2_score,
    team1Seed: r.team1_seed,
    team2Seed: r.team2_seed,
    team1GameWins: r.team1_game_wins,
    team2GameWins: r.team2_game_wins,
    winnerId: r.winner_id,
    loserId: r.loser_id,
    nextWinMatchId: r.next_win_match_id,
    nextLoseMatchId: r.next_lose_match_id,
    bestOf: r.best_of,
    status: (r.status as PlayoffMatch['status']) ?? 'pending',
  };
}

/**
 * Convert runtime model to database row
 */
export function toRow(m: PlayoffMatch): DatabasePlayoffMatch {
  return {
    id: m.id,
    bracket_id: m.bracket_id,
    round: m.round,
    position: m.position,
    match_type: m.matchType,
    team1_id: m.team1Id,
    team2_id: m.team2Id,
    team1_score: m.team1Score,
    team2_score: m.team2Score,
    team1_seed: m.team1Seed,
    team2_seed: m.team2Seed,
    team1_game_wins: m.team1GameWins,
    team2_game_wins: m.team2GameWins,
    winner_id: m.winnerId,
    loser_id: m.loserId,
    next_win_match_id: m.nextWinMatchId,
    next_lose_match_id: m.nextLoseMatchId,
    best_of: m.bestOf,
    status: m.status,
  };
}
