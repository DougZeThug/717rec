
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { createAppMatch, createDbMatch, setupAdapterTest } from './helpers/playoffAdapterTestHelpers';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      savePlayoffMatches: vi.fn(),
      getBracketMatches: vi.fn(),
      advanceTeam: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter - Match Operations', () => {
  let facade: ReturnType<typeof setupAdapterTest>;

  beforeEach(() => {
    facade = setupAdapterTest();
  });

  describe('savePlayoffMatches', () => {
    it('should convert application match to database format and save it', async () => {
      // Arrange
      const appMatch = createAppMatch();
      
      // Act
      await PlayoffDatabaseAdapter.savePlayoffMatches([appMatch]);
      
      // Assert
      expect(facade.savePlayoffMatches).toHaveBeenCalledWith([
        expect.objectContaining({
          id: '1',
          bracket_id: 'bracket1',
          round: 1,
          position: 1,
          match_type: 'winners',
          team1_id: 'team1',
          team2_id: 'team2',
          team1_seed: 1,
          team2_seed: 2,
        })
      ]);
    });

    it('should handle placeholder IDs by setting them to null', async () => {
      // Arrange
      const appMatch = createAppMatch({
        team1Id: 'play-in-1', // Use placeholder prefix
      });
      
      // Act
      await PlayoffDatabaseAdapter.savePlayoffMatches([appMatch]);
      
      // Assert
      expect(facade.savePlayoffMatches).toHaveBeenCalledWith([
        expect.objectContaining({
          team1_id: null, // Should be converted to null
          team2_id: 'team2'
        })
      ]);
    });
  });

  describe('getBracketMatches', () => {
    it('should fetch bracket matches from the database', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const dbMatches = [createDbMatch()]; // Use dbMatch instead of appMatch
      
      vi.mocked(facade.getBracketMatches).mockResolvedValueOnce(dbMatches);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getBracketMatches(bracketId);
      
      // Assert
      expect(facade.getBracketMatches).toHaveBeenCalledWith(bracketId);
      expect(result).toEqual(dbMatches);
    });
  });

  describe('advanceTeam', () => {
    it('should advance a team to the next match', async () => {
      // Arrange
      const nextMatchId = 'next-match';
      const teamId = 'team1';
      const isWinner = true;
      
      // Act
      await PlayoffDatabaseAdapter.advanceTeam(nextMatchId, teamId, isWinner);
      
      // Assert
      expect(facade.advanceTeam).toHaveBeenCalledWith(nextMatchId, teamId, isWinner);
    });
    
    it('should handle advancing a team as a loser', async () => {
      // Arrange
      const nextMatchId = 'loser-match';
      const teamId = 'team2';
      const isWinner = false;
      
      // Act
      await PlayoffDatabaseAdapter.advanceTeam(nextMatchId, teamId, isWinner);
      
      // Assert
      expect(facade.advanceTeam).toHaveBeenCalledWith(nextMatchId, teamId, isWinner);
    });
  });
});
