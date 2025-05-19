
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { createAppMatch, createBracketState, setupAdapterTest } from './helpers/playoffAdapterTestHelpers';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      markWinnersBracketChampion: vi.fn(),
      setResetMatchNeeded: vi.fn(),
      markTournamentComplete: vi.fn(),
      createResetMatch: vi.fn(),
      getBracketState: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter - Tournament State Operations', () => {
  let facade: ReturnType<typeof setupAdapterTest>;

  beforeEach(() => {
    facade = setupAdapterTest();
  });

  describe('markWinnersBracketChampion', () => {
    it('should mark a team as winners bracket champion', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const championId = 'team1';
      
      // Act
      await PlayoffDatabaseAdapter.markWinnersBracketChampion(bracketId, championId);
      
      // Assert
      expect(facade.markWinnersBracketChampion).toHaveBeenCalledWith(bracketId, championId);
    });
  });

  describe('setResetMatchNeeded', () => {
    it('should set reset match needed to true', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const needed = true;
      
      // Act
      await PlayoffDatabaseAdapter.setResetMatchNeeded(bracketId, needed);
      
      // Assert
      expect(facade.setResetMatchNeeded).toHaveBeenCalledWith(bracketId, needed);
    });
    
    it('should set reset match needed to false', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const needed = false;
      
      // Act
      await PlayoffDatabaseAdapter.setResetMatchNeeded(bracketId, needed);
      
      // Assert
      expect(facade.setResetMatchNeeded).toHaveBeenCalledWith(bracketId, needed);
    });
  });

  describe('markTournamentComplete', () => {
    it('should mark a tournament as complete with the specified champion', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const championId = 'team1';
      
      // Act
      await PlayoffDatabaseAdapter.markTournamentComplete(bracketId, championId);
      
      // Assert
      expect(facade.markTournamentComplete).toHaveBeenCalledWith(bracketId, championId);
    });
  });

  describe('createResetMatch', () => {
    it('should create a reset match for the finals', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const team1Id = 'team1';
      const team2Id = 'team2';
      const resetMatch = createAppMatch();
      
      vi.mocked(facade.createResetMatch).mockResolvedValueOnce(resetMatch);
      
      // Act
      const result = await PlayoffDatabaseAdapter.createResetMatch(bracketId, team1Id, team2Id);
      
      // Assert
      expect(facade.createResetMatch).toHaveBeenCalledWith(bracketId, team1Id, team2Id);
      expect(result).toEqual(resetMatch);
    });
  });

  describe('getBracketState', () => {
    it('should get the current state of a bracket', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const expectedState = createBracketState({
        isWinnersBracketComplete: true,
        winnersBracketChampionId: 'team1',
      });
      
      vi.mocked(facade.getBracketState).mockResolvedValueOnce(expectedState);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getBracketState(bracketId);
      
      // Assert
      expect(facade.getBracketState).toHaveBeenCalledWith(bracketId);
      expect(result).toEqual(expectedState);
    });
    
    it('should handle a bracket with complete tournament', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const expectedState = createBracketState({
        isWinnersBracketComplete: true,
        isLosersBracketComplete: true,
        isComplete: true,
        championId: 'team1'
      });
      
      vi.mocked(facade.getBracketState).mockResolvedValueOnce(expectedState);
      
      // Act
      const result = await PlayoffDatabaseAdapter.getBracketState(bracketId);
      
      // Assert
      expect(facade.getBracketState).toHaveBeenCalledWith(bracketId);
      expect(result.isComplete).toBe(true);
      expect(result.championId).toBe('team1');
    });
  });
});
