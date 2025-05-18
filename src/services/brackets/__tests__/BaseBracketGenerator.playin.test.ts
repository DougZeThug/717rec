
import { Team } from "@/types";
import { BaseBracketGenerator } from "../generators/BaseBracketGenerator";
import { BracketMatch, PlayInResult, SeedTeam } from "../types";
import { describe, test, expect } from "vitest";

// Mock implementation of BaseBracketGenerator to test protected methods
class TestBracketGenerator extends BaseBracketGenerator {
  generate(): BracketMatch[] {
    return [];
  }
  
  // Expose the protected method for testing
  public testHandlePlayInMatches(): PlayInResult {
    return this.handlePlayInMatches();
  }
}

describe('BaseBracketGenerator Play-In Logic', () => {
  // Setup test cases as specified in the requirements
  const testCases = [
    { teamCount: 6, expectedPlayInMatches: 2, expectedAdvancingTeams: 4 },   // 6→8 bracket → 2 matches, 4 byes
    { teamCount: 7, expectedPlayInMatches: 1, expectedAdvancingTeams: 6 },   // 7→8 bracket → 1 match
    { teamCount: 8, expectedPlayInMatches: 0, expectedAdvancingTeams: 8 },   // Perfect power-of-two → none
    { teamCount: 9, expectedPlayInMatches: 7, expectedAdvancingTeams: 8 },   // 9→16 bracket → 7 matches
    { teamCount: 10, expectedPlayInMatches: 6, expectedAdvancingTeams: 8 },  // 10→16
    { teamCount: 11, expectedPlayInMatches: 5, expectedAdvancingTeams: 10 }, // 11→16
    { teamCount: 12, expectedPlayInMatches: 2, expectedAdvancingTeams: 10 }, // 12→16 (example in bug report)
    { teamCount: 13, expectedPlayInMatches: 3, expectedAdvancingTeams: 10 }, // 13→16
    { teamCount: 14, expectedPlayInMatches: 2, expectedAdvancingTeams: 12 }, // 14→16
    { teamCount: 15, expectedPlayInMatches: 1, expectedAdvancingTeams: 14 }, // 15→16
    { teamCount: 16, expectedPlayInMatches: 0, expectedAdvancingTeams: 16 }, // No play-ins
  ];
  
  // Loop through each test case as requested
  const cases = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const;
  
  // Create a reusable function to generate test teams
  const createTestTeams = (count: number): Team[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      seed: i + 1
    }));
  };
  
  // Run test for each team count
  cases.forEach(teamCount => {
    const expected = testCases.find(tc => tc.teamCount === teamCount);
    
    test(`With ${teamCount} teams, should generate ${expected?.expectedPlayInMatches} play-in matches and ${expected?.expectedAdvancingTeams} advancing teams`, () => {
      // Arrange
      const teams = createTestTeams(teamCount);
      const generator = new TestBracketGenerator('bracket-123', teams);
      
      // Act
      const result = generator.testHandlePlayInMatches();
      
      // Assert
      expect(result.playInMatches.length).toBe(expected?.expectedPlayInMatches);
      expect(result.advancingTeams.length).toBe(expected?.expectedAdvancingTeams);
      
      // Additional checks for play-in matches
      if (expected?.expectedPlayInMatches && expected.expectedPlayInMatches > 0) {
        // Verify all play-in matches have the correct properties
        result.playInMatches.forEach(match => {
          expect(match.matchType).toBe('play-in');
          expect(match.round).toBe(0);
          expect(match.bracket_id).toBe('bracket-123');
          // Each play-in match should have two teams assigned
          expect(match.team1Id).toBeDefined();
          expect(match.team2Id).toBeDefined();
        });
      }
      
      // When there are play-in matches, verify some of the advancing teams have placeholder IDs
      if (expected?.expectedPlayInMatches && expected.expectedPlayInMatches > 0) {
        const placeholderTeams = result.advancingTeams.filter(team => 
          typeof team.id === 'string' && team.id.startsWith('play-in-')
        );
        expect(placeholderTeams.length).toBe(expected.expectedPlayInMatches);
      }
    });
  });

  // Edge case: Test with smallest allowed team count
  test('Should handle minimal team count correctly', () => {
    const teams = createTestTeams(3);
    const generator = new TestBracketGenerator('bracket-min', teams);
    
    const result = generator.testHandlePlayInMatches();
    
    // With 3 teams, we need 1 play-in match to get to a 4-team bracket
    expect(result.playInMatches.length).toBe(1);
    expect(result.advancingTeams.length).toBe(2);
  });

  // Edge case: Test with very large team count (ensure it doesn't exceed Supabase's 50-row limit)
  test('Should handle large team count without exceeding row limits', () => {
    const teams = createTestTeams(40);
    const generator = new TestBracketGenerator('bracket-large', teams);
    
    const result = generator.testHandlePlayInMatches();
    
    // With 40 teams, we need 24 play-in matches to get to a 64-team bracket
    expect(result.playInMatches.length).toBe(24);
    expect(result.playInMatches.length + result.advancingTeams.length).toBeLessThanOrEqual(64);
    // Total number of matches should be under Supabase's 50-row limit for batch inserts
    expect(result.playInMatches.length).toBeLessThanOrEqual(50);
  });
});
