
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { createAppMatch, createGame, createMatchResult } from './helpers/playoffAdapterTestHelpers';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      savePlayoffMatches: vi.fn(),
      recordMatchResult: vi.fn(),
      getBracketMatches: vi.fn(),
      getMatchGames: vi.fn(),
      savePlayoffGames: vi.fn(),
      markWinnersBracketChampion: vi.fn(),
      markTournamentComplete: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter - Integration Tests', () => {
  let facade: PlayoffDatabaseFacade;

  beforeEach(() => {
    // Get the mocked constructor
    const FacadeMock = vi.mocked(PlayoffDatabaseFacade);
    // Clear all mocks
    FacadeMock.mockClear();
    // Access the facade instance from the adapter via private property
    facade = (PlayoffDatabaseAdapter as any).facade;
  });

  describe('Tournament Flow', () => {
    it('should handle a complete tournament flow: matches > games > results > champion', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const finalMatchId = 'finals-1';
      const match = createAppMatch({ id: finalMatchId, bracket_id: bracketId });
      const games = [
        createGame({ gameNumber: 1, team1Score: 21, team2Score: 18, winnerId: 'team1' }),
        createGame({ gameNumber: 2, team1Score: 18, team2Score: 21, winnerId: 'team2' }),
        createGame({ gameNumber: 3, team1Score: 21, team2Score: 19, winnerId: 'team1' })
      ];
      const result = createMatchResult({
        matchId: finalMatchId,
        winnerId: 'team1',
        loserId: 'team2',
        team1Score: 2,
        team2Score: 1,
        team1GameWins: 2,
        team2GameWins: 1,
        games
      });
      
      // Mock responses
      vi.mocked(facade.getBracketMatches).mockResolvedValueOnce([match]);
      vi.mocked(facade.getMatchGames).mockResolvedValueOnce(games);
      
      // Act - Create the matches
      await PlayoffDatabaseAdapter.savePlayoffMatches([match]);
      
      // Act - Save games
      await PlayoffDatabaseAdapter.savePlayoffGames(games);
      
      // Act - Record match result
      await PlayoffDatabaseAdapter.recordMatchResult(finalMatchId, result);
      
      // Act - Mark tournament complete
      await PlayoffDatabaseAdapter.markTournamentComplete(bracketId, 'team1');
      
      // Assert
      expect(facade.savePlayoffMatches).toHaveBeenCalledWith([expect.objectContaining({ id: finalMatchId })]);
      expect(facade.savePlayoffGames).toHaveBeenCalledWith(games);
      expect(facade.recordMatchResult).toHaveBeenCalledWith(expect.objectContaining({ 
        match_id: finalMatchId,
        winner_id: 'team1',
        loser_id: 'team2'
      }));
      expect(facade.markTournamentComplete).toHaveBeenCalledWith(bracketId, 'team1');
    });
  });
});
