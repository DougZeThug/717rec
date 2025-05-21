
import { describe, it, expect } from 'vitest';
import { MatchMapper } from '../MatchMapper';
import { MatchDto } from '@/types/supabase.generated';

describe('MatchMapper', () => {
  describe('matchDtoToDomain', () => {
    it('should correctly map match DTO to domain model', () => {
      // Arrange
      const matchDto: MatchDto = {
        id: 'match-1',
        bracket_id: 'bracket-1',
        round_number: 1,
        position: 2,
        team1_id: 'team-1',
        team2_id: 'team-2',
        winner_id: 'team-1',
        loser_id: 'team-2',
        team1_score: 2,
        team2_score: 1,
        team1_game_wins: 2,
        team2_game_wins: 1,
        match_type: 'winners',
        best_of: 3,
        metadata: {
          team1_seed: 1,
          team2_seed: 2
        },
        next_win_match_id: 'next-win-match',
        next_lose_match_id: 'next-lose-match',
        status: 'completed'
      };

      // Act
      const result = MatchMapper.matchDtoToDomain(matchDto);

      // Assert
      expect(result).toEqual({
        id: 'match-1',
        bracket_id: 'bracket-1',
        round: 1,
        position: 2,
        team1Id: 'team-1',
        team2Id: 'team-2',
        winnerId: 'team-1',
        loserId: 'team-2',
        team1Score: 2,
        team2Score: 1,
        team1GameWins: 2,
        team2GameWins: 1,
        matchType: 'winners',
        bestOf: 3,
        team1Seed: 1,
        team2Seed: 2,
        nextWinMatchId: 'next-win-match',
        nextLoseMatchId: 'next-lose-match',
        status: 'completed'
      });
    });

    it('should handle missing values with defaults', () => {
      // Arrange
      const matchDto = {
        id: 'match-1',
        bracket_id: 'bracket-1',
        round_number: null, // Missing round
        position: null, // Missing position
        team1_id: null,
        team2_id: null,
        match_type: null, // Missing match type
        best_of: null, // Missing best of
      } as unknown as MatchDto;

      // Act
      const result = MatchMapper.matchDtoToDomain(matchDto);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: 'match-1',
          bracket_id: 'bracket-1',
          round: 0, // Default round
          position: 0, // Default position
          matchType: 'winners', // Default match type
          bestOf: 3, // Default best of
          team1Seed: null,
          team2Seed: null,
          nextWinMatchId: null,
          nextLoseMatchId: null,
          status: 'pending'
        })
      );
    });
  });
});
