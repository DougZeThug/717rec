
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { createGame, setupAdapterTest } from './helpers/playoffAdapterTestHelpers';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      savePlayoffGames: vi.fn(),
      getMatchGames: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter - Game Operations', () => {
  let facade: ReturnType<typeof setupAdapterTest>;

  beforeEach(() => {
    facade = setupAdapterTest();
  });

  describe('savePlayoffGames', () => {
    it('should save playoff games to the database', async () => {
      // Arrange
      const games = [createGame()];
      
      // Act
      await PlayoffDatabaseAdapter.savePlayoffGames(games);
      
      // Assert
      expect(facade.savePlayoffGames).toHaveBeenCalledWith(games);
    });
    
    it('should handle empty games array', async () => {
      // Arrange
      const games: any[] = [];
      
      // Act
      await PlayoffDatabaseAdapter.savePlayoffGames(games);
      
      // Assert
      expect(facade.savePlayoffGames).toHaveBeenCalledWith(games);
    });
  });

  describe('getMatchGames', () => {
    it('should fetch match games from the database', async () => {
      // Arrange
      const matchId = 'match1';
      const games = [createGame()];
      
      vi.mocked(facade.getMatchGames).mockResolvedValueOnce(games);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getMatchGames(matchId);
      
      // Assert
      expect(facade.getMatchGames).toHaveBeenCalledWith(matchId);
      expect(result).toEqual(games);
    });
    
    it('should handle empty game results', async () => {
      // Arrange
      const matchId = 'match1';
      const games: any[] = [];
      
      vi.mocked(facade.getMatchGames).mockResolvedValueOnce(games);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getMatchGames(matchId);
      
      // Assert
      expect(facade.getMatchGames).toHaveBeenCalledWith(matchId);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
});
