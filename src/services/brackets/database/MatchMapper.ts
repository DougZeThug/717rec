import { PlayoffMatch, PlayoffMatchType } from '@/utils/playoffs/playoffTypes';

/**
 * Maps database match records to the PlayoffMatch type used in the application
 */
export function toRuntime(dbMatch: any): PlayoffMatch {
  if (!dbMatch) return null as any;

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
    status: dbMatch.status || (dbMatch.iscompleted ? 'completed' : 'pending'),
  };
}

/**
 * Maps a PlayoffMatch back to the database format
 */
export function toDatabase(match: PlayoffMatch): any {
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
