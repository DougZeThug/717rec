
import { describe, it, expect } from 'vitest';
import { nanoid } from "nanoid";
import { PlayoffBracketLinker } from "../playoff/PlayoffBracketLinker";
import { PlayoffMatch, PlayoffMatchType } from "../../types";

describe("PlayoffBracketLinker", () => {
  const bracketId = "test-bracket-123";
  
  // Helper to create a test match
  const createTestMatch = (
    round: number, 
    position: number, 
    matchType: PlayoffMatchType = "winners"
  ): PlayoffMatch => ({
    id: nanoid(),
    round,
    position,
    matchType,
    bracket_id: bracketId,
    team1Id: null,
    team2Id: null,
    team1Seed: null,
    team2Seed: null,
    team1Score: null,
    team2Score: null,
    team1GameWins: null,
    team2GameWins: null,
    bestOf: 3,
    winnerId: null,
    loserId: null,
    nextWinMatchId: null,
    nextLoseMatchId: null,
    status: "pending"
  });
  
  describe("constructor", () => {
    it("should initialize with empty match map if not provided", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      expect(linker.getMatchMap()).toEqual({});
    });
    
    it("should use provided match map if given", () => {
      const matchMap = {
        "test-key": createTestMatch(1, 1)
      };
      const linker = new PlayoffBracketLinker(bracketId, matchMap);
      expect(linker.getMatchMap()).toEqual(matchMap);
    });
  });
  
  describe("linkPlayInMatches", () => {
    it("should link play-in matches to first round winners matches", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      
      const playInMatch1 = createTestMatch(0, 1, "play-in");
      const playInMatch2 = createTestMatch(0, 2, "play-in");
      
      const firstRoundMatch1 = {
        ...createTestMatch(1, 1),
        team1Id: `play-in-1`
      };
      
      const firstRoundMatch2 = {
        ...createTestMatch(1, 2),
        team2Id: `play-in-2`
      };
      
      const matches = [
        playInMatch1,
        playInMatch2,
        firstRoundMatch1,
        firstRoundMatch2,
        createTestMatch(1, 3) // Not linked to play-in
      ];
      
      linker.linkPlayInMatches(matches);
      
      expect(playInMatch1.nextWinMatchId).toBe(firstRoundMatch1.id);
      expect(playInMatch2.nextWinMatchId).toBe(firstRoundMatch2.id);
    });
    
    it("should not link if no matching target is found", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      
      const playInMatch = createTestMatch(0, 3, "play-in");
      const firstRoundMatch = createTestMatch(1, 1);
      
      const matches = [playInMatch, firstRoundMatch];
      linker.linkPlayInMatches(matches);
      
      expect(playInMatch.nextWinMatchId).toBeNull();
    });
  });
  
  describe("linkWinnersBracket", () => {
    it("should link winners bracket matches to next round", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      
      // Create a simple 8-team bracket (3 rounds)
      const round1Matches = [
        createTestMatch(1, 1, "winners"),
        createTestMatch(1, 2, "winners"),
        createTestMatch(1, 3, "winners"),
        createTestMatch(1, 4, "winners")
      ];
      
      const round2Matches = [
        createTestMatch(2, 1, "winners"),
        createTestMatch(2, 2, "winners")
      ];
      
      const round3Matches = [
        createTestMatch(3, 1, "winners")
      ];
      
      const matches = [...round1Matches, ...round2Matches, ...round3Matches];
      
      // Create losers matches for linking losers
      const losersMatches = [
        createTestMatch(1, 1, "losers"),
        createTestMatch(1, 2, "losers"),
        createTestMatch(2, 1, "losers")
      ];
      
      matches.push(...losersMatches);
      
      linker.linkWinnersBracket(matches, 3);
      
      // Check winners advances to next round
      expect(round1Matches[0].nextWinMatchId).toBe(round2Matches[0].id);
      expect(round1Matches[1].nextWinMatchId).toBe(round2Matches[0].id);
      expect(round1Matches[2].nextWinMatchId).toBe(round2Matches[1].id);
      expect(round1Matches[3].nextWinMatchId).toBe(round2Matches[1].id);
      
      expect(round2Matches[0].nextWinMatchId).toBe(round3Matches[0].id);
      expect(round2Matches[1].nextWinMatchId).toBe(round3Matches[0].id);
      
      // Check losers go to losers bracket
      expect(round1Matches[0].nextLoseMatchId).toBeDefined();
      expect(round1Matches[1].nextLoseMatchId).toBeDefined();
      expect(round2Matches[0].nextLoseMatchId).toBeDefined();
    });
  });
  
  describe("linkLosersBracket", () => {
    it("should link losers bracket matches to next round", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      
      // Create losers bracket matches (6 rounds for an 8-team bracket)
      const losersMatches = [
        createTestMatch(1, 1, "losers"),
        createTestMatch(1, 2, "losers"),
        createTestMatch(2, 1, "losers"),
        createTestMatch(3, 1, "losers"),
        createTestMatch(4, 1, "losers"),
        createTestMatch(5, 1, "losers"),
        createTestMatch(6, 1, "losers")
      ];
      
      // Finals match
      const finalsMatch = createTestMatch(1, 1, "finals");
      
      const matches = [...losersMatches, finalsMatch];
      
      linker.linkLosersBracket(matches, 3);
      
      // Check that each losers match links to the next round
      expect(losersMatches[0].nextWinMatchId).toBe(losersMatches[2].id);
      expect(losersMatches[1].nextWinMatchId).toBe(losersMatches[2].id);
      expect(losersMatches[2].nextWinMatchId).toBe(losersMatches[3].id);
      expect(losersMatches[3].nextWinMatchId).toBe(losersMatches[4].id);
      expect(losersMatches[4].nextWinMatchId).toBe(losersMatches[5].id);
      expect(losersMatches[5].nextWinMatchId).toBe(losersMatches[6].id);
      
      // Check final losers match links to finals
      expect(losersMatches[6].nextWinMatchId).toBe(finalsMatch.id);
    });
  });
  
  describe("generateFinals", () => {
    it("should create a finals match and add it to the matches array", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      const matches: PlayoffMatch[] = [];
      
      const updatedMatches = linker.generateFinals(matches);
      
      expect(updatedMatches.length).toBe(1);
      expect(updatedMatches[0].matchType).toBe("finals");
      expect(updatedMatches[0].round).toBe(1);
      expect(updatedMatches[0].position).toBe(1);
      
      // Check it was added to the match map
      const matchMap = linker.getMatchMap();
      expect(matchMap["finals-1"]).toBeDefined();
      expect(matchMap["finals-1"].matchType).toBe("finals");
    });
  });
  
  describe("createResetMatch", () => {
    it("should create a reset match for the finals", () => {
      const linker = new PlayoffBracketLinker(bracketId);
      
      const resetMatch = linker.createResetMatch();
      
      expect(resetMatch.matchType).toBe("finals");
      expect(resetMatch.round).toBe(2); // Second round of finals is the reset
      expect(resetMatch.position).toBe(1);
      
      // Check it was added to the match map
      const matchMap = linker.getMatchMap();
      expect(matchMap["finals-2"]).toBeDefined();
      expect(matchMap["finals-2"].id).toBe(resetMatch.id);
    });
  });
});
