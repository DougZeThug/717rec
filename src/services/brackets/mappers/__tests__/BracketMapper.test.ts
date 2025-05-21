
import { describe, it, expect } from 'vitest';
import { BracketMapper } from '../BracketMapper';
import { BracketDto } from '@/types/supabase.generated';

describe('BracketMapper', () => {
  describe('bracketDtoToDomain', () => {
    it('should correctly map bracket DTO to domain model', () => {
      // Arrange
      const bracketDto: BracketDto = {
        id: 'test-bracket-id',
        title: 'Test Bracket',
        format: 'double_elimination',
        state: 'pending',
        division_id: 'div-1',
        created_at: '2023-01-01T00:00:00Z'
      };
      
      const matchesDto = [
        {
          id: 'match-1',
          bracket_id: 'test-bracket-id',
          round_number: 1,
          position: 1,
          team1_id: 'team-1',
          team2_id: 'team-2',
          winner_id: null,
          loser_id: null,
          match_type: 'winners',
          best_of: 3
        }
      ];

      // Act
      const result = BracketMapper.bracketDtoToDomain(bracketDto, matchesDto);

      // Assert
      expect(result).toEqual({
        id: 'test-bracket-id',
        name: 'Test Bracket',
        format: 'double_elimination',
        state: 'pending',
        division: 'div-1',
        created_at: '2023-01-01T00:00:00Z',
        matches: [
          expect.objectContaining({
            id: 'match-1',
            bracket_id: 'test-bracket-id',
            round: 1,
            position: 1,
            team1Id: 'team-1',
            team2Id: 'team-2',
            matchType: 'winners',
            bestOf: 3
          })
        ]
      });
    });

    it('should handle missing or invalid values with defaults', () => {
      // Arrange
      const bracketDto = {
        id: 'test-bracket-id',
        title: 'Test Bracket',
        format: 'invalid_format', // Invalid format
        state: null, // Missing state
      } as unknown as BracketDto;

      // Act
      const result = BracketMapper.bracketDtoToDomain(bracketDto, []);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          id: 'test-bracket-id',
          name: 'Test Bracket',
          format: 'double_elimination', // Default format
          state: 'pending', // Default state
          matches: []
        })
      );
    });
  });
});
