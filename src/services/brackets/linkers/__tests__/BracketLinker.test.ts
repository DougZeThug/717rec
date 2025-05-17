
import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from "nanoid";
import { BracketLinker } from "../../BracketLinker";
import { BracketMatch, MatchType } from "../../types";

describe("BracketLinker", () => {
  const bracketId = "test-bracket-123";
  
  // Helper to create a test match
  const createTestMatch = (
    round: number, 
    position: number, 
    matchType: MatchType = "winners"
  ): BracketMatch => ({
    id: nanoid(),
    round,
    position,
    matchType,
    team1Id: null,
    team2Id: null,
    team1Seed: null,
    team2Seed: null,
    nextWinMatchId: null,
    nextLoseMatchId: null,
    winnerId: null,
    bracket_id: bracketId
  });
  
  describe("constructor", () => {
    it("should initialize with empty match map if not provided", () => {
      const linker = new BracketLinker(bracketId);
      expect(linker.getMatchMap()).toEqual({});
    });
    
    it("should use provided match map if given", () => {
      const matchMap = {
        "test-key": createTestMatch(1, 1)
      };
      const linker = new BracketLinker(bracketId, matchMap);
      expect(linker.getMatchMap()).toEqual(matchMap);
    });
  });
  
  describe("findTargetMatchForPlayIn", () => {
    it("should find the correct target match for play-in match", () => {
      const linker = new BracketLinker(bracketId);
      
      const playInMatch = createTestMatch(0, 3, "play-in");
      
      const firstRoundMatches = [
        createTestMatch(1, 1),
        {
          ...createTestMatch(1, 2),
          team1Id: "play-in-3"
        },
        createTestMatch(1, 3)
      ];
      
      // Using a protected method through type assertion for testing
      const result = (linker as any).findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      expect(result).toBe(firstRoundMatches[1]);
    });
    
    it("should return null if no matching target found", () => {
      const linker = new BracketLinker(bracketId);
      
      const playInMatch = createTestMatch(0, 5, "play-in");
      const firstRoundMatches = [
        {
          ...createTestMatch(1, 1),
          team1Id: "play-in-1"
        },
        {
          ...createTestMatch(1, 2),
          team2Id: "play-in-2"
        }
      ];
      
      // Using a protected method through type assertion for testing
      const result = (linker as any).findTargetMatchForPlayIn(playInMatch, firstRoundMatches);
      expect(result).toBeNull();
    });
  });
  
  describe("linkPlayInMatches", () => {
    it("should link play-in matches to corresponding first round matches", () => {
      const linker = new BracketLinker(bracketId);
      
      const playInMatches = [
        createTestMatch(0, 1, "play-in"),
        createTestMatch(0, 2, "play-in")
      ];
      
      const firstRoundMatches = [
        {
          ...createTestMatch(1, 1),
          team1Id: "play-in-1"
        },
        {
          ...createTestMatch(1, 2),
          team2Id: "play-in-2"
        },
        createTestMatch(1, 3)
      ];
      
      const allMatches = [...playInMatches, ...firstRoundMatches];
      
      linker.linkPlayInMatches(allMatches);
      
      expect(playInMatches[0].nextWinMatchId).toBe(firstRoundMatches[0].id);
      expect(playInMatches[1].nextWinMatchId).toBe(firstRoundMatches[1].id);
    });
  });
  
  describe("organizeMatchesByType", () => {
    it("should organize matches by type and round", () => {
      const linker = new BracketLinker(bracketId);
      
      const matches = [
        createTestMatch(1, 1, "winners"),
        createTestMatch(1, 2, "winners"),
        createTestMatch(2, 1, "winners"),
        createTestMatch(1, 1, "losers"),
        createTestMatch(2, 1, "losers"),
        createTestMatch(1, 1, "finals")
      ];
      
      // Using a protected method through type assertion for testing
      const organized = (linker as any).organizeMatchesByType(matches);
      
      expect(organized.winners[1].length).toBe(2);
      expect(organized.winners[2].length).toBe(1);
      expect(organized.losers[1].length).toBe(1);
      expect(organized.losers[2].length).toBe(1);
      expect(organized.finals[1].length).toBe(1);
    });
  });
  
  describe("connectWinnersBracket", () => {
    it("should correctly link winners bracket matches", () => {
      const linker = new BracketLinker(bracketId);
      
      // Create a bracket with 2 rounds of winners bracket
      const round1Match1 = createTestMatch(1, 1, "winners");
      const round1Match2 = createTestMatch(1, 2, "winners");
      const round2Match = createTestMatch(2, 1, "winners");
      
      const matches = [round1Match1, round1Match2, round2Match];
      
      // Organize matches by type
      const matchesByType = {
        'winners': { 
          1: [round1Match1, round1Match2], 
          2: [round2Match] 
        },
        'losers': {},
        'finals': {},
        'play-in': {}
      };
      
      // Using a protected method through type assertion for testing
      (linker as any).connectWinnersBracket(matchesByType);
      
      // Check that winners are linked to next round
      expect(round1Match1.nextWinMatchId).toBe(round2Match.id);
      expect(round1Match2.nextWinMatchId).toBe(round2Match.id);
    });
  });
  
  describe("connectLosersBracket", () => {
    it("should correctly link losers bracket matches", () => {
      const linker = new BracketLinker(bracketId);
      
      // Create a bracket with 2 rounds of losers bracket
      const round1Match1 = createTestMatch(1, 1, "losers");
      const round1Match2 = createTestMatch(1, 2, "losers");
      const round2Match = createTestMatch(2, 1, "losers");
      
      // Organize matches by type
      const matchesByType = {
        'winners': {},
        'losers': { 
          1: [round1Match1, round1Match2], 
          2: [round2Match] 
        },
        'finals': {},
        'play-in': {}
      };
      
      // Using a protected method through type assertion for testing
      (linker as any).connectLosersBracket(matchesByType);
      
      // Check that winners are linked to next round
      expect(round1Match1.nextWinMatchId).toBe(round2Match.id);
      expect(round1Match2.nextWinMatchId).toBe(round2Match.id);
    });
  });
  
  describe("connectBrackets", () => {
    it("should link all sections of the bracket together", () => {
      const linker = new BracketLinker(bracketId);
      
      // Create test matches for each section
      const winnerR1M1 = createTestMatch(1, 1, "winners");
      const winnerR1M2 = createTestMatch(1, 2, "winners");
      const winnerR2M1 = createTestMatch(2, 1, "winners");
      
      const loserR1M1 = createTestMatch(1, 1, "losers");
      const loserR2M1 = createTestMatch(2, 1, "losers");
      
      const finals = createTestMatch(1, 1, "finals");
      const reset = createTestMatch(2, 1, "finals");
      
      const matches = [
        winnerR1M1, winnerR1M2, winnerR2M1,
        loserR1M1, loserR2M1,
        finals, reset
      ];
      
      linker.connectBrackets(matches);
      
      // Check that winners bracket is linked
      expect(winnerR1M1.nextWinMatchId).toBe(winnerR2M1.id);
      expect(winnerR1M2.nextWinMatchId).toBe(winnerR2M1.id);
      
      // Check that winners final is linked to grand finals
      expect(winnerR2M1.nextWinMatchId).toBe(finals.id);
      
      // Check that losers bracket is linked
      expect(loserR1M1.nextWinMatchId).toBe(loserR2M1.id);
      
      // Check that losers final is linked to grand finals
      expect(loserR2M1.nextWinMatchId).toBe(finals.id);
      
      // Check that grand finals is linked to reset match
      expect(finals.nextWinMatchId).toBe(reset.id);
    });
  });
});
