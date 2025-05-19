
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlayoffDatabaseAdapter } from '../database/PlayoffDatabaseAdapter';
import { PlayoffDatabaseFacade } from '../database/PlayoffDatabaseFacade';
import { PlayoffMatchType } from '../types';
import { DatabasePlayoffMatch } from '../database/types';

// Test fixtures and helper functions
const createAppMatch = () => ({
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
});

const createDbMatch = (): DatabasePlayoffMatch => ({
  id: '1',
  round: 1,
  position: 1,
  match_type: 'winners' as PlayoffMatchType,
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
});

const createMatchResult = () => ({
  matchId: 'match1',
  winnerId: 'team1',
  loserId: 'team2',
  team1Score: 2,
  team2Score: 1,
  team1GameWins: 2,
  team2GameWins: 1,
  games: [{ 
    id: '1', 
    matchId: 'match1', 
    gameNumber: 1,
    team1Score: 21,
    team2Score: 18,
    winnerId: 'team1'
  }]
});

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

  describe('Match Operations', () => {
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
      const appMatch = {
        ...createAppMatch(),
        team1Id: 'play-in-1', // Use placeholder prefix
        team2Id: 'team2'
      };
      
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
      expect(result[0].team2_id).toBe('team2');
    });
  });

  describe('Game Operations', () => {
    it('should save playoff games to the database', async () => {
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

    it('should fetch match games from the database', async () => {
      // Arrange
      const matchId = 'match1';
      const games = [{ 
        id: '1', 
        matchId: 'match1', 
        gameNumber: 1,
        team1Score: 21,
        team2Score: 18,
        winnerId: 'team1'
      }];
      
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

  describe('Match Result Operations', () => {
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

  describe('Tournament State Operations', () => {
    it('should mark a team as winners bracket champion', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const championId = 'team1';
      
      // Act
      await PlayoffDatabaseAdapter.markWinnersBracketChampion(bracketId, championId);
      
      // Assert
      expect(facade.markWinnersBracketChampion).toHaveBeenCalledWith(bracketId, championId);
    });

    it('should set whether a reset match is needed', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const needed = true;
      
      // Act
      await PlayoffDatabaseAdapter.setResetMatchNeeded(bracketId, needed);
      
      // Assert
      expect(facade.setResetMatchNeeded).toHaveBeenCalledWith(bracketId, needed);
    });

    it('should mark a tournament as complete with the specified champion', async () => {
      // Arrange
      const bracketId = 'bracket1';
      const championId = 'team1';
      
      // Act
      await PlayoffDatabaseAdapter.markTournamentComplete(bracketId, championId);
      
      // Assert
      expect(facade.markTournamentComplete).toHaveBeenCalledWith(bracketId, championId);
    });

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

    it('should get the current state of a bracket', async () => {
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
});
