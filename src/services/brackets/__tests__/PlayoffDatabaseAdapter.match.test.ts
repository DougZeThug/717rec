
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { createAppMatch, createDbMatch } from './fixtures/matchFixtures';
import { DatabasePlayoffMatch } from '../database/types';

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
  let facade: PlayoffDatabaseFacade;

  beforeEach(() => {
    // Get the mocked constructor
    const FacadeMock = vi.mocked(PlayoffDatabaseFacade);
    // Clear all mocks
    FacadeMock.mockClear();
    // Access the facade instance from the adapter via private property
    facade = (PlayoffDatabaseAdapter as any).facade;
  });

  describe('savePlayoffMatches', () => {
    it('should convert application match to database format and save it', async () => {
      // Arrange
      const appMatch = createAppMatch();
      const expectedDbMatch = createDbMatch();
      
      // Act
      await PlayoffDatabaseAdapter.savePlayoffMatches([appMatch]);
      
      // Assert
      expect(facade.savePlayoffMatches).toHaveBeenCalledWith([
        expect.objectContaining(expectedDbMatch)
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
      const dbMatches: DatabasePlayoffMatch[] = [createDbMatch()];
      
      vi.mocked(facade.getBracketMatches).mockResolvedValueOnce(dbMatches);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getBracketMatches(bracketId);
      
      // Assert
      expect(facade.getBracketMatches).toHaveBeenCalledWith(bracketId);
      expect(result).toHaveLength(1);
      expect(result[0].match_type).toBe('winners');
      expect(result[0].team1_id).toBe('team1');
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
  });
});
