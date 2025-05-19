
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { createMatchResult } from './fixtures/matchFixtures';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      recordMatchResult: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter - Match Result Operations', () => {
  let facade: PlayoffDatabaseFacade;

  beforeEach(() => {
    // Get the mocked constructor
    const FacadeMock = vi.mocked(PlayoffDatabaseFacade);
    // Clear all mocks
    FacadeMock.mockClear();
    // Access the facade instance from the adapter via private property
    facade = (PlayoffDatabaseAdapter as any).facade;
  });

  describe('recordMatchResult', () => {
    it('should convert match result to database format and save it', async () => {
      // Arrange
      const matchResult = createMatchResult();
      
      // Act
      await PlayoffDatabaseAdapter.recordMatchResult('match1', matchResult);
      
      // Assert
      expect(facade.recordMatchResult).toHaveBeenCalledWith({
        match_id: 'match1',
        winner_id: matchResult.winnerId,
        loser_id: matchResult.loserId,
        team1_score: matchResult.team1Score,
        team2_score: matchResult.team2Score,
        team1_game_wins: matchResult.team1GameWins,
        team2_game_wins: matchResult.team2GameWins,
        completed: true,
        games: matchResult.games
      });
    });

    it('should handle match results without games', async () => {
      // Arrange
      const matchResult = createMatchResult({ games: undefined });
      
      // Act
      await PlayoffDatabaseAdapter.recordMatchResult('match1', matchResult);
      
      // Assert
      expect(facade.recordMatchResult).toHaveBeenCalledWith({
        match_id: 'match1',
        winner_id: matchResult.winnerId,
        loser_id: matchResult.loserId,
        team1_score: matchResult.team1Score,
        team2_score: matchResult.team2Score,
        team1_game_wins: matchResult.team1GameWins,
        team2_game_wins: matchResult.team2GameWins,
        completed: true,
        games: undefined
      });
    });
  });
});
