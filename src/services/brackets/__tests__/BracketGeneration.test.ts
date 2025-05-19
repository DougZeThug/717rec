
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { SingleEliminationGenerator } from '../generators/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '../generators/DoubleEliminationGenerator';
import { Team } from "@/types";

// Helper to create n teams for testing
const createTeams = (n: number): Team[] => {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
    wins: 0,
    losses: 0
  }));
};

describe('SingleEliminationGenerator Tests', () => {
  // Test power-of-two team counts
  it('generates correct bracket for 8 teams', () => {
    const teams = createTeams(8);
    const bracketId = nanoid();
    const generator = new SingleEliminationGenerator(bracketId, teams);
    const matches = generator.generate();
    
    // Check structure
    expect(matches.length).toBeGreaterThan(0);
    
    // Count rounds
    const rounds = [...new Set(matches.map(m => m.round))].sort();
    expect(rounds).toEqual([1, 2, 3]);
    
    // No play-in matches expected
    const playInMatches = matches.filter(m => m.matchType === 'play-in');
    expect(playInMatches.length).toBe(0);
  });
  
  // Test non-power-of-two team counts
  it('generates correct bracket with play-ins for 13 teams', () => {
    const teams = createTeams(13);
    const bracketId = nanoid();
    const generator = new SingleEliminationGenerator(bracketId, teams);
    const matches = generator.generate();
    
    // Check for play-in matches
    const playInMatches = matches.filter(m => m.matchType === 'play-in');
    expect(playInMatches.length).toBeGreaterThan(0);
    
    // Validate all teams are placed
    const uniqueTeamIds = new Set();
    matches.forEach(match => {
      if (match.team1Id && !match.team1Id.startsWith('play-in-')) {
        uniqueTeamIds.add(match.team1Id);
      }
      if (match.team2Id && !match.team2Id.startsWith('play-in-')) {
        uniqueTeamIds.add(match.team2Id);
      }
    });
    expect(uniqueTeamIds.size).toBe(13);
  });
});

describe('DoubleEliminationGenerator Tests', () => {
  // Test power-of-two team counts
  it('generates correct bracket for 8 teams', () => {
    const teams = createTeams(8);
    const bracketId = nanoid();
    const generator = new DoubleEliminationGenerator(bracketId, teams);
    const matches = generator.generate();
    
    // Check that we have winners bracket, losers bracket, and finals
    const matchTypes = [...new Set(matches.map(m => m.matchType))];
    expect(matchTypes).toContain('winners');
    expect(matchTypes).toContain('losers');
    expect(matchTypes).toContain('finals');
    
    // No play-in matches expected
    const playInMatches = matches.filter(m => m.matchType === 'play-in');
    expect(playInMatches.length).toBe(0);
  });
  
  // Test non-power-of-two team counts
  it('generates correct bracket with play-ins for 13 teams', () => {
    const teams = createTeams(13);
    const bracketId = nanoid();
    const generator = new DoubleEliminationGenerator(bracketId, teams);
    const matches = generator.generate();
    
    // Check for play-in matches
    const playInMatches = matches.filter(m => m.matchType === 'play-in');
    expect(playInMatches.length).toBeGreaterThan(0);
    
    // Count losers round 0 matches (should match play-in count)
    const losersRound0 = matches.filter(m => m.matchType === 'losers' && m.round === 0);
    expect(losersRound0.length).toBe(playInMatches.length);
  });
});
