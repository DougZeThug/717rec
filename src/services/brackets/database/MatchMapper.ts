import { PlayoffMatch, PlayoffMatchType } from '@/utils/playoffs/playoffTypes';

/**
 * Shape of a playoff match row as returned from the database
 */
interface DatabasePlayoffMatch {
  id: string;
  round?: number;
  round_number?: number;
  position: number;
  team1_id?: string | null;
  team2_id?: string | null;
  winner_id?: string | null;
  loser_id?: string | null;
  team1_score?: number | null;
  team2_score?: number | null;
  team1_game_wins?: number | null;
  team2_game_wins?: number | null;
  match_type?: string;
  best_of?: number;
  team1_seed?: number | null;
  team2_seed?: number | null;
  metadata?: { team1_seed?: number | null; team2_seed?: number | null };
  next_win_match_id?: string | null;
  next_match_id?: string | null;
  next_lose_match_id?: string | null;
  next_loser_match_id?: string | null;
  bracket_id: string;
  status?: string;
  iscompleted?: boolean;
}

/**
 * Shape of a playoff match object ready for database insertion
 */
interface DatabasePlayoffMatchInsert {
  id: string;
  round: number;
  round_number: number;
  position: number;
  team1_id: string | null | undefined;
  team2_id: string | null | undefined;
  winner_id: string | null | undefined;
  loser_id: string | null | undefined;
  team1_score: number | null | undefined;
  team2_score: number | null | undefined;
  team1_game_wins: number | null | undefined;
  team2_game_wins: number | null | undefined;
  match_type: string;
  best_of: number | undefined;
  metadata: { team1_seed: number | null | undefined; team2_seed: number | null | undefined };
  next_win_match_id: string | null | undefined;
  next_lose_match_id: string | null | undefined;
  next_match_id: string | null | undefined;
  next_loser_match_id: string | null | undefined;
  bracket_id: string;
  status: string | undefined;
}

/**
 * Maps database match records to the PlayoffMatch type used in the application
 */
export function toRuntime(dbMatch: DatabasePlayoffMatch | null): PlayoffMatch {
  if (!dbMatch) return null as unknown as PlayoffMatch;

  return {
    id: dbMatch.id,
    round: dbMatch.round || dbMatch.round_number,
    position: dbMatch.position,
    team1Id: dbMatch.team1_id || null,
    team2Id: dbMatch.team2_id || null,
    winnerId: dbMatch.winner_id || null,
    loserId: dbMatch.loser_id || null,
    team1Score: dbMatch.team1_score || null,
    team2Score: dbMatch.team2_score || null,
    team1GameWins: dbMatch.team1_game_wins || null,
    team2GameWins: dbMatch.team2_game_wins || null,
    matchType: (dbMatch.match_type || 'winners') as PlayoffMatchType,
    bestOf: dbMatch.best_of || 3,
    team1Seed: dbMatch.team1_seed || dbMatch.metadata?.team1_seed || null,
    team2Seed: dbMatch.team2_seed || dbMatch.metadata?.team2_seed || null,
    nextWinMatchId: dbMatch.next_win_match_id || dbMatch.next_match_id || null,
    nextLoseMatchId: dbMatch.next_lose_match_id || dbMatch.next_loser_match_id || null,
    bracket_id: dbMatch.bracket_id,
    status: (dbMatch.status ||
      (dbMatch.iscompleted ? 'completed' : 'pending')) as PlayoffMatch['status'],
  };
}

/**
 * Maps a PlayoffMatch back to the database format
 */
export function toDatabase(match: PlayoffMatch): DatabasePlayoffMatchInsert {
  return {
    id: match.id,
    round: match.round,
    round_number: match.round,
    position: match.position,
    team1_id: match.team1Id,
    team2_id: match.team2Id,
    winner_id: match.winnerId,
    loser_id: match.loserId,
    team1_score: match.team1Score,
    team2_score: match.team2Score,
    team1_game_wins: match.team1GameWins,
    team2_game_wins: match.team2GameWins,
    match_type: match.matchType,
    best_of: match.bestOf,
    metadata: {
      team1_seed: match.team1Seed,
      team2_seed: match.team2Seed,
    },
    next_win_match_id: match.nextWinMatchId,
    next_lose_match_id: match.nextLoseMatchId,
    next_match_id: match.nextWinMatchId,
    next_loser_match_id: match.nextLoseMatchId,
    bracket_id: match.bracket_id,
    status: match.status,
  };
}
