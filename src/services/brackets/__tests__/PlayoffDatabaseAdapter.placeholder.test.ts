
import { describe, test, expect, vi, beforeEach } from "vitest";
import { PlayoffDatabaseAdapter } from "../database/PlayoffDatabaseAdapter";
import { PlayoffMatch } from "../types";

// Mock the PlayoffDatabaseFacade
vi.mock("../database/PlayoffDatabaseFacade", () => {
  return {
    PlayoffDatabaseFacade: class {
      savePlayoffMatches = vi.fn();
      getBracketMatches = vi.fn();
      savePlayoffGames = vi.fn();
      getMatchGames = vi.fn();
      recordMatchResult = vi.fn();
      advanceTeam = vi.fn();
      markWinnersBracketChampion = vi.fn();
      setResetMatchNeeded = vi.fn();
      markTournamentComplete = vi.fn();
      createResetMatch = vi.fn();
      getBracketState = vi.fn();
    }
  };
});

describe("PlayoffDatabaseAdapter - Placeholder IDs", () => {
  const facadeMock = (PlayoffDatabaseAdapter as any).facade;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  test("should replace play-in placeholder IDs with null before saving matches", async () => {
    // Sample matches with placeholder IDs
    const matches: PlayoffMatch[] = [
      {
        id: "match-1",
        bracket_id: "bracket-1",
        round: 1,
        position: 1,
        matchType: "winners",
        team1Id: "play-in-1", // Placeholder ID that should be replaced with null
        team2Id: "real-team-id", // Regular team ID that should remain unchanged
        team1Seed: 1,
        team2Seed: 2,
        nextWinMatchId: "match-3",
        nextLoseMatchId: "match-4",
        winnerId: null,
        bestOf: 3
      },
      {
        id: "match-2",
        bracket_id: "bracket-1",
        round: 1,
        position: 2,
        matchType: "winners",
        team1Id: "another-real-team", 
        team2Id: "play-in-2", // Placeholder ID that should be replaced with null
        team1Seed: 3,
        team2Seed: 4,
        nextWinMatchId: "match-3",
        nextLoseMatchId: "match-5",
        winnerId: null,
        bestOf: 3
      }
    ];
    
    // Call the savePlayoffMatches method
    await PlayoffDatabaseAdapter.savePlayoffMatches(matches);
    
    // Validate the transformed matches passed to the facade
    expect(facadeMock.savePlayoffMatches).toHaveBeenCalledTimes(1);
    
    const savedMatches = facadeMock.savePlayoffMatches.mock.calls[0][0];
    expect(savedMatches).toHaveLength(2);
    
    // First match: team1Id should be null, team2Id should be unchanged
    expect(savedMatches[0].team1_id).toBeNull();
    expect(savedMatches[0].team2_id).toBe("real-team-id");
    
    // Second match: team1Id should be unchanged, team2Id should be null
    expect(savedMatches[1].team1_id).toBe("another-real-team");
    expect(savedMatches[1].team2_id).toBeNull();
  });
  
  test("should handle null or undefined team IDs gracefully", async () => {
    const matches: PlayoffMatch[] = [
      {
        id: "match-3",
        bracket_id: "bracket-1",
        round: 2,
        position: 1,
        matchType: "winners",
        team1Id: null, // Already null
        team2Id: undefined, // Undefined
        team1Seed: 1,
        team2Seed: 2,
        nextWinMatchId: "match-5",
        nextLoseMatchId: null,
        winnerId: null,
        bestOf: 3
      }
    ];
    
    await PlayoffDatabaseAdapter.savePlayoffMatches(matches);
    
    const savedMatches = facadeMock.savePlayoffMatches.mock.calls[0][0];
    expect(savedMatches[0].team1_id).toBeNull();
    expect(savedMatches[0].team2_id).toBeUndefined();
  });
});
