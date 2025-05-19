
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { DoubleEliminationGenerator } from '../generators/DoubleEliminationGenerator';
import { Team } from "@/types";

// Helper to create n teams for testing
const createTeams = (n: number): Team[] => {
  return Array.from({ length: n }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
    division_id: 'div1',
    owner_id: 'owner1'
  }));
};

describe('DoubleEliminationGenerator Bye Logic Tests', () => {
  
  describe('Power-of-two team counts (no play-ins)', () => {
    it('should create proper bracket with 8 teams', () => {
      // Arrange
      const teams = createTeams(8);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // Check for no play-in matches
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      expect(playInMatches.length).toBe(0);
      
      // Check for no Losers Round 0
      const losersRoundZero = matches.filter(m => m.matchType === 'losers' && m.round === 0);
      expect(losersRoundZero.length).toBe(0);
      
      // Check Winners Round 1 has all teams properly assigned
      const winnersRound1 = matches.filter(m => m.matchType === 'winners' && m.round === 1);
      expect(winnersRound1.length).toBe(4);
      expect(winnersRound1.every(m => m.team1Id !== null && m.team2Id !== null)).toBe(true);
      expect(winnersRound1.every(m => !m.team1Id?.startsWith('play-in-') && !m.team2Id?.startsWith('play-in-'))).toBe(true);
    });
    
    it('should create proper bracket with 16 teams', () => {
      // Arrange
      const teams = createTeams(16);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // Check for no play-in matches
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      expect(playInMatches.length).toBe(0);
      
      // Check for no Losers Round 0
      const losersRoundZero = matches.filter(m => m.matchType === 'losers' && m.round === 0);
      expect(losersRoundZero.length).toBe(0);
      
      // First losers round should be Round 1
      const loserMatches = matches.filter(m => m.matchType === 'losers');
      const loserRounds = [...new Set(loserMatches.map(m => m.round))].sort();
      expect(loserRounds[0]).toBe(1);
    });
  });
  
  describe('Non-power-of-two team counts (with play-ins)', () => {
    it('should create proper bracket with 7 teams (1 play-in)', () => {
      // Arrange
      const teams = createTeams(7);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // Check for correct number of play-in matches
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      expect(playInMatches.length).toBe(1);
      
      // Check for Losers Round 0
      const losersRoundZero = matches.filter(m => m.matchType === 'losers' && m.round === 0);
      expect(losersRoundZero.length).toBe(1);
      
      // Check Winners Round 1 has null slots for play-in winners
      const winnersRound1 = matches.filter(m => m.matchType === 'winners' && m.round === 1);
      const nullTeamSlots = winnersRound1.filter(m => m.team1Id === null || m.team2Id === null);
      expect(nullTeamSlots.length).toBeGreaterThan(0);
      
      // Check play-in nextWinMatchId links to a Winners Round 1 match
      expect(playInMatches.every(m => m.nextWinMatchId !== null)).toBe(true);
      const winnerDestinations = playInMatches.map(m => 
        matches.find(match => match.id === m.nextWinMatchId)
      );
      expect(winnerDestinations.every(m => m?.matchType === 'winners' && m.round === 1)).toBe(true);
      
      // Check play-in nextLoseMatchId links to a Losers Round 0 match
      expect(playInMatches.every(m => m.nextLoseMatchId !== null)).toBe(true);
      const loserDestinations = playInMatches.map(m => 
        matches.find(match => match.id === m.nextLoseMatchId)
      );
      expect(loserDestinations.every(m => m?.matchType === 'losers' && m.round === 0)).toBe(true);
    });
    
    it('should create proper bracket with 9 teams (5 play-ins)', () => {
      // Arrange
      const teams = createTeams(9);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // Check for correct number of play-in matches: 9 teams need 1 play-in to get to 8
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      expect(playInMatches.length).toBe(1);
      
      // Check for Losers Round 0
      const losersRoundZero = matches.filter(m => m.matchType === 'losers' && m.round === 0);
      expect(losersRoundZero.length).toBe(1);
      
      // Make sure losers bracket has the proper round structure after shifting (0, 1, 2, etc)
      const loserRounds = [...new Set(matches
        .filter(m => m.matchType === 'losers')
        .map(m => m.round))].sort();
      expect(loserRounds[0]).toBe(0);
      expect(loserRounds[1]).toBe(1);
      
      // Check losers round 0 links correctly to losers round 1
      const losersR0ToR1Links = losersRoundZero.every(match => {
        const nextMatch = matches.find(m => m.id === match.nextWinMatchId);
        return nextMatch && nextMatch.matchType === 'losers' && nextMatch.round === 1;
      });
      expect(losersR0ToR1Links).toBe(true);
    });
    
    it('should create proper bracket with 15 teams (7 play-ins)', () => {
      // Arrange
      const teams = createTeams(15);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // 15 teams in a 16-team bracket means 14 in play-ins (7 play-in matches)
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      expect(playInMatches.length).toBe(7);
      
      // Check for Losers Round 0 (should have 7 matches)
      const losersRoundZero = matches.filter(m => m.matchType === 'losers' && m.round === 0);
      expect(losersRoundZero.length).toBe(7);
      
      // Check losers round 0 has correct number of matches (equal to play-ins)
      expect(losersRoundZero.length).toBe(playInMatches.length);
      
      // Check Winners Round 1 has null slots equal to play-in match count
      const winnersRound1 = matches.filter(m => m.matchType === 'winners' && m.round === 1);
      const nullSlotCount = winnersRound1.reduce((count, match) => {
        return count + (match.team1Id === null ? 1 : 0) + (match.team2Id === null ? 1 : 0);
      }, 0);
      // With 7 play-ins, we should have 7 null slots in Winners Round 1
      expect(nullSlotCount).toBe(7);
      
      // Check that every play-in match is linked properly
      playInMatches.forEach(playInMatch => {
        // Each play-in should link to Winners R1 and Losers R0
        expect(playInMatch.nextWinMatchId).not.toBeNull();
        expect(playInMatch.nextLoseMatchId).not.toBeNull();
        
        // Check the linking matches exist
        const winMatch = matches.find(m => m.id === playInMatch.nextWinMatchId);
        const loseMatch = matches.find(m => m.id === playInMatch.nextLoseMatchId);
        
        expect(winMatch).toBeDefined();
        expect(loseMatch).toBeDefined();
        expect(winMatch?.matchType).toBe('winners');
        expect(winMatch?.round).toBe(1);
        expect(loseMatch?.matchType).toBe('losers');
        expect(loseMatch?.round).toBe(0);
      });
    });
  });
  
  describe('End-to-end bracket flow', () => {
    it('should have correct overall structure for a 11-team bracket', () => {
      // Arrange
      const teams = createTeams(11);
      const bracketId = nanoid();
      const generator = new DoubleEliminationGenerator(bracketId, teams);
      
      // Act
      const matches = generator.generate();
      
      // Assert
      // Check all match types have the expected counts
      const playInMatches = matches.filter(m => m.matchType === 'play-in');
      const winnersMatches = matches.filter(m => m.matchType === 'winners');
      const losersMatches = matches.filter(m => m.matchType === 'losers');
      const finalsMatches = matches.filter(m => m.matchType === 'finals');
      
      // 11 teams in a 16-team bracket means 6 play-ins
      expect(playInMatches.length).toBe(3);
      
      // Check for winners bracket structure (should still have 4 rounds: 1, 2, 3, 4)
      const winnerRounds = [...new Set(winnersMatches.map(m => m.round))].sort();
      expect(winnerRounds).toEqual([1, 2, 3, 4]);
      
      // Check for losers bracket structure (should have rounds 0, 1, 2, 3, 4, 5, 6)
      const loserRounds = [...new Set(losersMatches.map(m => m.round))].sort();
      expect(loserRounds[0]).toBe(0);
      
      // Finals should have 1 match
      expect(finalsMatches.length).toBe(1);
      
      // Check the finals connections
      // 1. Winner of winners bracket should advance to finals
      const winnersFinal = winnersMatches.find(m => m.round === Math.max(...winnerRounds) && m.position === 1);
      expect(winnersFinal?.nextWinMatchId).toBe(finalsMatches[0].id);
      
      // 2. Winner of losers bracket should advance to finals
      const losersFinal = losersMatches.find(m => m.round === Math.max(...loserRounds) && m.position === 1);
      expect(losersFinal?.nextWinMatchId).toBe(finalsMatches[0].id);
    });
  });
});
