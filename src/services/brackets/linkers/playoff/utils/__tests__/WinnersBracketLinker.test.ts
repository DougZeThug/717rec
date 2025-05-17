
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { PlayoffMatch, PlayoffMatchType } from '../../../../types';
import { WinnersBracketLinker } from '../WinnersBracketLinker';

describe('WinnersBracketLinker', () => {
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
  
  describe('linkWinnersBracket', () => {
    it('should link winners bracket matches correctly', () => {
      // Create a test bracket with 8 teams (3 rounds)
      const round1Matches = [
        createTestMatch(1, 1, 'winners'),
        createTestMatch(1, 2, 'winners'),
        createTestMatch(1, 3, 'winners'),
        createTestMatch(1, 4, 'winners')
      ];
      
      const round2Matches = [
        createTestMatch(2, 1, 'winners'),
        createTestMatch(2, 2, 'winners')
      ];
      
      const round3Matches = [
        createTestMatch(3, 1, 'winners')
      ];
      
      const losersMatches = [
        createTestMatch(1, 1, 'losers'),
        createTestMatch(1, 2, 'losers'),
        createTestMatch(2, 1, 'losers')
      ];
      
      const finalsMatch = createTestMatch(1, 1, 'finals');
      
      const matches = [
        ...round1Matches,
        ...round2Matches,
        ...round3Matches,
        ...losersMatches,
        finalsMatch
      ];
      
      // Link all matches
      WinnersBracketLinker.linkWinnersBracket(matches, 3);
      
      // Check winners bracket linking
      // Round 1 -> Round 2
      expect(round1Matches[0].nextWinMatchId).toBe(round2Matches[0].id);
      expect(round1Matches[1].nextWinMatchId).toBe(round2Matches[0].id);
      expect(round1Matches[2].nextWinMatchId).toBe(round2Matches[1].id);
      expect(round1Matches[3].nextWinMatchId).toBe(round2Matches[1].id);
      
      // Round 2 -> Round 3
      expect(round2Matches[0].nextWinMatchId).toBe(round3Matches[0].id);
      expect(round2Matches[1].nextWinMatchId).toBe(round3Matches[0].id);
      
      // Round 3 -> Finals
      expect(round3Matches[0].nextWinMatchId).toBe(finalsMatch.id);
      
      // Check losers bracket linking
      expect(round1Matches[0].nextLoseMatchId).toBeDefined();
      expect(round1Matches[1].nextLoseMatchId).toBeDefined();
      expect(round2Matches[0].nextLoseMatchId).toBeDefined();
    });
  });
  
  describe('linkWinnersFinalToGrandFinals', () => {
    it('should link winners final to grand finals match', () => {
      const winnersFinal = createTestMatch(3, 1, 'winners');
      const grandFinal = createTestMatch(1, 1, 'finals');
      
      const matches = [winnersFinal, grandFinal];
      
      WinnersBracketLinker.linkWinnersFinalToGrandFinals(matches, 3);
      
      expect(winnersFinal.nextWinMatchId).toBe(grandFinal.id);
    });
    
    it('should not link if no finals match exists', () => {
      const winnersFinal = createTestMatch(3, 1, 'winners');
      const matches = [winnersFinal];
      
      WinnersBracketLinker.linkWinnersFinalToGrandFinals(matches, 3);
      
      expect(winnersFinal.nextWinMatchId).toBeNull();
    });
  });
});
