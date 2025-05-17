
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nanoid } from "nanoid";
import { BracketLinker } from "../../BracketLinker";
import { BracketMatch, MatchType } from "../../types";

describe("BracketLinker", () => {
  const bracketId = "test-bracket-id";
  
  // Helper to create test matches
  const createTestMatch = (
    round: number, 
    position: number, 
    matchType: MatchType = "winners"
  ): BracketMatch => ({
    id: nanoid(),
    round,
    position,
    matchType,
    bracket_id: bracketId,
    team1Id: null,
    team2Id: null,
    team1Seed: null,
    team2Seed: null,
    nextWinMatchId: null,
    nextLoseMatchId: null,
    winnerId: null
  });
  
  // Setup for each test
  let linker: BracketLinker;
  
  beforeEach(() => {
    linker = new BracketLinker(bracketId);
  });
  
  describe("linkPlayInMatches", () => {
    it("should correctly link play-in matches to first round matches", () => {
      // Create test data
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
        firstRoundMatch2
      ];
      
      // Execute test
      linker.linkPlayInMatches(matches);
      
      // Verify results
      expect(playInMatch1.nextWinMatchId).toBe(firstRoundMatch1.id);
      expect(playInMatch2.nextWinMatchId).toBe(firstRoundMatch2.id);
    });
    
    it("should not link play-in matches if no matches have the corresponding placeholder", () => {
      // Create test data
      const playInMatch = createTestMatch(0, 1, "play-in");
      const firstRoundMatch = createTestMatch(1, 1);
      
      // Execute test
      linker.linkPlayInMatches([playInMatch, firstRoundMatch]);
      
      // Verify results
      expect(playInMatch.nextWinMatchId).toBeNull();
    });
  });
  
  describe("connectBrackets", () => {
    it("should link winners bracket matches to next round and losers bracket", () => {
      // Create an 8-team bracket structure
      const matches: BracketMatch[] = [];
      
      // Winners bracket - Round 1 (4 matches)
      for (let i = 1; i <= 4; i++) {
        matches.push(createTestMatch(1, i, "winners"));
      }
      
      // Winners bracket - Round 2 (2 matches)
      for (let i = 1; i <= 2; i++) {
        matches.push(createTestMatch(2, i, "winners"));
      }
      
      // Winners bracket - Round 3 (1 match)
      matches.push(createTestMatch(3, 1, "winners"));
      
      // Losers bracket - Round 1 (2 matches)
      for (let i = 1; i <= 2; i++) {
        matches.push(createTestMatch(1, i, "losers"));
      }
      
      // Losers bracket - Round 2 (1 match)
      matches.push(createTestMatch(2, 1, "losers"));
      
      // Losers bracket - Round 3 (1 match)
      matches.push(createTestMatch(3, 1, "losers"));
      
      // Losers bracket - Round 4 (1 match)
      matches.push(createTestMatch(4, 1, "losers"));
      
      // Finals - Round 1 (1 match)
      matches.push(createTestMatch(1, 1, "finals"));
      
      // Execute test
      linker.connectBrackets(matches);
      
      // Get matches by type and round
      const wb_r1 = matches.filter(m => m.matchType === "winners" && m.round === 1);
      const wb_r2 = matches.filter(m => m.matchType === "winners" && m.round === 2);
      const wb_r3 = matches.filter(m => m.matchType === "winners" && m.round === 3);
      
      const lb_r1 = matches.filter(m => m.matchType === "losers" && m.round === 1);
      const lb_r2 = matches.filter(m => m.matchType === "losers" && m.round === 2);
      
      const finals = matches.filter(m => m.matchType === "finals");
      
      // Verify winners bracket connectivity
      expect(wb_r1[0].nextWinMatchId).toBe(wb_r2[0].id);
      expect(wb_r1[1].nextWinMatchId).toBe(wb_r2[0].id);
      expect(wb_r1[2].nextWinMatchId).toBe(wb_r2[1].id);
      expect(wb_r1[3].nextWinMatchId).toBe(wb_r2[1].id);
      
      expect(wb_r2[0].nextWinMatchId).toBe(wb_r3[0].id);
      expect(wb_r2[1].nextWinMatchId).toBe(wb_r3[0].id);
      
      expect(wb_r3[0].nextWinMatchId).toBe(finals[0].id);
      
      // Verify losers flow
      expect(wb_r1[0].nextLoseMatchId).toBeDefined();
      expect(wb_r1[1].nextLoseMatchId).toBeDefined();
      expect(wb_r1[2].nextLoseMatchId).toBeDefined();
      expect(wb_r1[3].nextLoseMatchId).toBeDefined();
      
      // Verify losers bracket connectivity
      expect(lb_r1[0].nextWinMatchId).toBe(lb_r2[0].id);
      expect(lb_r1[1].nextWinMatchId).toBe(lb_r2[0].id);
    });
  });
  
  describe("getMatchMap", () => {
    it("should return the match map", () => {
      const matchMap = { "test-key": createTestMatch(1, 1) };
      const customLinker = new BracketLinker(bracketId, matchMap);
      
      expect(customLinker.getMatchMap()).toBe(matchMap);
    });
  });
  
  describe("bracket connectivity calculations", () => {
    it("should calculate loser destination round correctly", () => {
      const linkerInstance = new BracketLinker(bracketId);
      const calculateLoserRound = (linkerInstance as any).calculateLoserDestinationRound;
      
      expect(calculateLoserRound(1)).toBe(1);  // Winners round 1 losers go to losers round 1
      expect(calculateLoserRound(2)).toBe(3);  // Winners round 2 losers go to losers round 3
      expect(calculateLoserRound(3)).toBe(5);  // Winners round 3 losers go to losers round 5
    });
  });
});
