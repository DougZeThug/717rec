
import { PlayoffMatch, PlayoffMatchType } from '@/types/playoffs';
import { MatchDto } from '@/types/supabase.generated';

/**
 * Maps a database match DTO to a domain match model
 */
export const matchDtoToDomain = (matchDto: MatchDto): PlayoffMatch => {
  return {
    id: matchDto.id,
    bracket_id: matchDto.bracket_id,
    round: matchDto.round_number || 0,
    position: matchDto.position || 0,
    team1Id: matchDto.team1_id,
    team2Id: matchDto.team2_id,
    winnerId: matchDto.winner_id,
    loserId: matchDto.loser_id,
    team1Score: matchDto.team1_score,
    team2Score: matchDto.team2_score,
    team1GameWins: matchDto.team1_game_wins,
    team2GameWins: matchDto.team2_game_wins,
    matchType: (matchDto.match_type || 'winners') as PlayoffMatchType,
    bestOf: matchDto.best_of || 3,
    team1Seed: matchDto.metadata?.team1_seed || null,
    team2Seed: matchDto.metadata?.team2_seed || null,
    nextWinMatchId: matchDto.next_win_match_id || matchDto.next_match_id || null,
    nextLoseMatchId: matchDto.next_lose_match_id || matchDto.next_loser_match_id || null,
    status: (matchDto.status || 'pending') as 'pending' | 'in_progress' | 'completed'
  };
};

export const MatchMapper = {
  matchDtoToDomain,
};
