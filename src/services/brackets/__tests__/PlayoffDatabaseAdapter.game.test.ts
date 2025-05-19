
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { createGame } from './fixtures/matchFixtures';

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
  let facade: PlayoffDatabaseFacade;

  beforeEach(() => {
    // Get the mocked constructor
    const FacadeMock = vi.mocked(PlayoffDatabaseFacade);
    // Clear all mocks
    FacadeMock.mockClear();
    // Access the facade instance from the adapter via private property
    facade = (PlayoffDatabaseAdapter as any).facade;
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
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].team1Score).toBe(21);
    });
  });
});
