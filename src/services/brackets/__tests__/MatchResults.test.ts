
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchScoreService } from '../services/MatchScoreService';
import { bracketManager } from '../manager/BracketManager';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies
vi.mock('../manager/BracketManager', () => ({
  bracketManager: {
    getMatches: vi.fn(),
    updateMatchResult: vi.fn()
  }
}));

vi.mock('../database/PlayoffDatabaseAdapter', () => ({
  PlayoffDatabaseAdapter: {
    recordMatchResult: vi.fn()
  }
}));

describe('MatchScoreService', () => {
  // Reset mocks between tests
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('updateMatchScore', () => {
    it('should update match score and advance teams correctly', async () => {
      // Setup mock data
      const matchId = 'test-match-1';
      const team1Id = 'team-1';
      const team2Id = 'team-2';
      const team1Score = 2;
      const team2Score = 1;
      const games = [
        { team1Score: 21, team2Score: 19 },
        { team1Score: 18, team2Score: 21 },
        { team1Score: 21, team2Score: 15 }
      ];
      const team1GameWins = 2;
      const team2GameWins = 1;
      
      // Mock getMatches to return a test match
      vi.mocked(bracketManager.getMatches).mockResolvedValueOnce([{
        id: matchId,
        opponent1: { id: team1Id },
        opponent2: { id: team2Id },
        best_of: 3
      }]);
      
      // Call the service method
      await MatchScoreService.updateMatchScore(
        matchId, team1Score, team2Score, games, team1GameWins, team2GameWins
      );
      
      // Verify interactions with bracketManager
      expect(bracketManager.getMatches).toHaveBeenCalledWith({ id: matchId });
      expect(bracketManager.updateMatchResult).toHaveBeenCalledWith(matchId, {
        opponent1: {
          id: team1Id,
          score: team1Score,
          result: 'win'
        },
        opponent2: {
          id: team2Id,
          score: team2Score,
          result: 'loss'
        },
        status: 'completed'
      });
      
      // Verify database adapter call with correct data
      expect(PlayoffDatabaseAdapter.recordMatchResult).toHaveBeenCalledWith(
        matchId,
        expect.objectContaining({
          winnerId: team1Id,
          loserId: team2Id,
          team1Score,
          team2Score,
          team1GameWins,
          team2GameWins,
          games: expect.any(Array)
        })
      );
    });
    
    it('should throw error when best-of validation fails', async () => {
      // Setup mock data with invalid game wins
      const matchId = 'test-match-1';
      const team1Id = 'team-1';
      const team2Id = 'team-2';
      // More game wins than allowed by best-of 3
      const team1GameWins = 3;
      const team2GameWins = 2;
      
      // Mock getMatches to return a test match
      vi.mocked(bracketManager.getMatches).mockResolvedValueOnce([{
        id: matchId,
        opponent1: { id: team1Id },
        opponent2: { id: team2Id },
        best_of: 3
      }]);
      
      // Expect the service method to throw
      await expect(
        MatchScoreService.updateMatchScore(
          matchId, 3, 2, [], team1GameWins, team2GameWins
        )
      ).rejects.toThrow(/exceeds the best-of/);
      
      // Verify no further interactions occurred
      expect(bracketManager.updateMatchResult).not.toHaveBeenCalled();
      expect(PlayoffDatabaseAdapter.recordMatchResult).not.toHaveBeenCalled();
    });
  });
});
