
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { PlayoffMatch, PlayoffMatchType } from '../types';

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
    const matches: PlayoffMatch[] = [{
      id: '1',
      round: 1,
      position: 1,
      matchType: 'winners' as PlayoffMatchType,
      bracket_id: 'bracket1',
      team1Id: 'team1',
      team2Id: 'team2',
      team1Seed: 1,
      team2Seed: 2,
      status: 'pending'
    }];
    
    // Act
    await PlayoffDatabaseAdapter.savePlayoffMatches(matches);
    
    // Assert
    expect(facade.savePlayoffMatches).toHaveBeenCalledWith(matches);
  });

  it('should call facade.getBracketMatches when getBracketMatches is called', async () => {
    // Arrange
    const bracketId = 'bracket1';
    const expectedMatches: PlayoffMatch[] = [{
      id: '1',
      round: 1,
      position: 1,
      matchType: 'winners' as PlayoffMatchType,
      bracket_id: bracketId,
      team1Id: 'team1',
      team2Id: 'team2',
      team1Seed: 1,
      team2Seed: 2,
      status: 'pending'
    }];
    
    vi.mocked(facade.getBracketMatches).mockResolvedValueOnce(expectedMatches);
    
    // Act
    const result = await PlayoffDatabaseAdapter.getBracketMatches(bracketId);
    
    // Assert
    expect(facade.getBracketMatches).toHaveBeenCalledWith(bracketId);
    expect(result).toBe(expectedMatches);
  });

  // Add more tests for other methods as needed
});
