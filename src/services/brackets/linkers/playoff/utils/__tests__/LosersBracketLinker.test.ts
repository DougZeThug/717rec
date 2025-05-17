
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { PlayoffMatch, PlayoffMatchType } from '../../../../types';
import { LosersBracketLinker } from '../LosersBracketLinker';

describe('LosersBracketLinker', () => {
  const bracketId = 'test-bracket-id';
  
  // Helper function to create test matches
  const createTestMatch = (
    round: number, 
    position: number, 
    matchType: PlayoffMatchType = 'winners'
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
    status: 'pending'
  });
  
  describe('linkLosersBracket', () => {
    it('should link losers bracket matches correctly', () => {
      // Create a test bracket with losers matches for an 8-team bracket
      const losersMatches = [
        createTestMatch(1, 1, 'losers'),
        createTestMatch(1, 2, 'losers'),
        createTestMatch(2, 1, 'losers'),
        createTestMatch(3, 1, 'losers'),
        createTestMatch(4, 1, 'losers'),
        createTestMatch(5, 1, 'losers')
      ];
      
      const finalsMatch = createTestMatch(1, 1, 'finals');
      
      const matches = [...losersMatches, finalsMatch];
      
      // Link losers bracket
      LosersBracketLinker.linkLosersBracket(matches, 3);
      
      // Check losers bracket linking
      expect(losersMatches[0].nextWinMatchId).toBe(losersMatches[2].id);
      expect(losersMatches[1].nextWinMatchId).toBe(losersMatches[2].id);
      expect(losersMatches[2].nextWinMatchId).toBe(losersMatches[3].id);
      expect(losersMatches[3].nextWinMatchId).toBe(losersMatches[4].id);
      expect(losersMatches[4].nextWinMatchId).toBe(losersMatches[5].id);
      
      // The final losers match should link to the grand finals
      expect(losersMatches[5].nextWinMatchId).toBe(finalsMatch.id);
    });
  });
  
  describe('linkLosersFinalToGrandFinals', () => {
    it('should link losers final to grand finals match', () => {
      const losersFinal = createTestMatch(5, 1, 'losers');
      const grandFinal = createTestMatch(1, 1, 'finals');
      
      const matches = [losersFinal, grandFinal];
      
      LosersBracketLinker.linkLosersFinalToGrandFinals(matches, 5);
      
      expect(losersFinal.nextWinMatchId).toBe(grandFinal.id);
    });
    
    it('should not link if no finals match exists', () => {
      const losersFinal = createTestMatch(5, 1, 'losers');
      const matches = [losersFinal];
      
      LosersBracketLinker.linkLosersFinalToGrandFinals(matches, 5);
      
      expect(losersFinal.nextWinMatchId).toBeNull();
    });
  });
});
