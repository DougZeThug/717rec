
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { PlayoffMatchType } from '../types';
import { DatabasePlayoffMatch } from '../database/types';

// Mock the PlayoffDatabaseFacade
vi.mock('../database/PlayoffDatabaseFacade', () => {
  return {
    PlayoffDatabaseFacade: vi.fn().mockImplementation(() => ({
      savePlayoffMatches: vi.fn(),
      savePlayoffGames: vi.fn(),
      recordMatchResult: vi.fn(),
      markWinnersBracketChampion: vi.fn(),
      setResetMatchNeeded: vi.fn(),
      markTournamentComplete: vi.fn(),
      advanceTeam: vi.fn(),
      getBracketMatches: vi.fn(),
      getMatchGames: vi.fn(),
      createResetMatch: vi.fn(),
      getBracketState: vi.fn(),
    }))
  };
});

describe('PlayoffDatabaseAdapter', () => {
  let facade: PlayoffDatabaseFacade;

  beforeEach(() => {
    // Get the mocked constructor
    const FacadeMock = vi.mocked(PlayoffDatabaseFacade);
    // Clear all mocks
    FacadeMock.mockClear();
    // Access the facade instance from the adapter via private property
    facade = (PlayoffDatabaseAdapter as any).facade;
  });

  it('should call facade.savePlayoffMatches when savePlayoffMatches is called', async () => {
    // Arrange
    const appMatch = {
      id: '1',
      round: 1,
      position: 1,
      matchType: 'winners' as PlayoffMatchType,
      bracket_id: 'bracket1',
      team1Id: 'team1',
      team2Id: 'team2',
      team1Seed: 1,
      team2Seed: 2,
      status: 'pending' as "pending" | "in_progress" | "completed",
      team1Score: null,
      team2Score: null,
      team1GameWins: null,
      team2GameWins: null,
      bestOf: 3,
      winnerId: null,
      loserId: null,
      nextWinMatchId: null,
      nextLoseMatchId: null
    };
    
    // Create the expected DatabasePlayoffMatch that would be passed to the facade
    const expectedDbMatch: DatabasePlayoffMatch = {
      id: '1',
      round: 1,
      position: 1,
      match_type: 'winners',
      bracket_id: 'bracket1',
      team1_id: 'team1',
      team2_id: 'team2',
      team1_seed: 1,
      team2_seed: 2,
      status: 'pending',
      team1_score: null,
      team2_score: null,
      best_of: 3,
      winner_id: null,
      loser_id: null,
      next_win_match_id: null,
      next_lose_match_id: null,
      team1_game_wins: null,
      team2_game_wins: null
    };
    
    // Act
    await PlayoffDatabaseAdapter.savePlayoffMatches([appMatch]);
    
    // Assert
    expect(facade.savePlayoffMatches).toHaveBeenCalledWith([expect.objectContaining(expectedDbMatch)]);
  });

  it('should call facade.getBracketMatches when getBracketMatches is called', async () => {
    // Arrange
    const bracketId = 'bracket1';
    const dbMatches: DatabasePlayoffMatch[] = [{
      id: '1',
      round: 1,
      position: 1,
      match_type: 'winners',
      bracket_id: bracketId,
      team1_id: 'team1',
      team2_id: 'team2',
      team1_seed: 1,
      team2_seed: 2,
      status: 'pending',
      team1_score: null,
      team2_score: null,
      best_of: 3,
      winner_id: null,
      loser_id: null,
      next_win_match_id: null,
      next_lose_match_id: null,
      team1_game_wins: null,
      team2_game_wins: null
    }];
    
    vi.mocked(facade.getBracketMatches).mockResolvedValueOnce(dbMatches);
    
    // Act
    const result = await PlayoffDatabaseAdapter.getBracketMatches(bracketId);
    
    // Assert
    expect(facade.getBracketMatches).toHaveBeenCalledWith(bracketId);
    expect(result).toHaveLength(1);
    expect(result[0].matchType).toBe('winners');
    expect(result[0].team1Id).toBe('team1');
    expect(result[0].team2Id).toBe('team2');
  });

  it('should call facade.savePlayoffGames when savePlayoffGames is called', async () => {
    // Arrange
    const games = [{ 
      id: '1', 
      matchId: 'match1', 
      gameNumber: 1,
      team1Score: 21,
      team2Score: 18,
      winnerId: 'team1'
    }];
    
    // Act
    await PlayoffDatabaseAdapter.savePlayoffGames(games);
    
    // Assert
    expect(facade.savePlayoffGames).toHaveBeenCalledWith(games);
  });

  it('should call facade.recordMatchResult when recordMatchResult is called', async () => {
    // Arrange
    const matchResult = {
      matchId: 'match1',
      winnerId: 'team1',
      loserId: 'team2',
      team1Score: 2,
      team2Score: 1,
      games: [{ 
        id: '1', 
        matchId: 'match1', 
        gameNumber: 1,
        team1Score: 21,
        team2Score: 18,
        winnerId: 'team1'
      }]
    };
    
    // Act
    await PlayoffDatabaseAdapter.recordMatchResult(matchResult);
    
    // Assert
    expect(facade.recordMatchResult).toHaveBeenCalledWith(matchResult);
  });

  it('should call facade.markTournamentComplete when markTournamentComplete is called', async () => {
    // Arrange
    const bracketId = 'bracket1';
    const championId = 'team1';
    
    // Act
    await PlayoffDatabaseAdapter.markTournamentComplete(bracketId, championId);
    
    // Assert
    expect(facade.markTournamentComplete).toHaveBeenCalledWith(bracketId, championId);
  });

  it('should call facade.getBracketState when getBracketState is called', async () => {
    // Arrange
    const bracketId = 'bracket1';
    const expectedState = {
      isWinnersBracketComplete: true,
      isLosersBracketComplete: false,
      isResetMatchNeeded: false,
      isComplete: false,
      winnersBracketChampionId: 'team1',
      losersBracketChampionId: null,
      championId: null
    };
    
    vi.mocked(facade.getBracketState).mockResolvedValueOnce(expectedState);
    
    // Act
    const result = await PlayoffDatabaseAdapter.getBracketState(bracketId);
    
    // Assert
    expect(facade.getBracketState).toHaveBeenCalledWith(bracketId);
    expect(result).toEqual(expectedState);
  });
});
