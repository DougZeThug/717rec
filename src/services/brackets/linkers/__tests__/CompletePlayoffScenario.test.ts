
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { PlayoffMatch, PlayoffMatchType } from '../../types';
import { PlayoffBracketLinker } from '../playoff/PlayoffBracketLinker';

describe('Complete Playoff Bracket Scenario', () => {
  const bracketId = 'test-bracket-id';
  
  // Helper function to create test matches
  const createMatch = (
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
  
  describe('8-team double elimination bracket', () => {
    it('should create a properly linked bracket', () => {
      // Create matches for a standard 8-team double elimination bracket
      const matches: PlayoffMatch[] = [];
      
      // Create winners bracket matches (3 rounds)
      // Round 1 (4 matches)
      for (let i = 1; i <= 4; i++) {
        matches.push(createMatch(1, i, 'winners'));
      }
      
      // Round 2 (2 matches)
      for (let i = 1; i <= 2; i++) {
        matches.push(createMatch(2, i, 'winners'));
      }
      
      // Round 3 (1 match - winners final)
      matches.push(createMatch(3, 1, 'winners'));
      
      // Create losers bracket matches (5 rounds in losers bracket for 8-team DE)
      // Round 1 (2 matches)
      for (let i = 1; i <= 2; i++) {
        matches.push(createMatch(1, i, 'losers'));
      }
      
      // Round 2 (2 matches)
      for (let i = 1; i <= 2; i++) {
        matches.push(createMatch(2, i, 'losers'));
      }
      
      // Round 3, 4, 5 (1 match each)
      matches.push(createMatch(3, 1, 'losers'));
      matches.push(createMatch(4, 1, 'losers'));
      matches.push(createMatch(5, 1, 'losers'));
      
      // Create the linker and link all matches
      const linker = new PlayoffBracketLinker(bracketId);
      
      // Link all bracket sections
      linker.linkMatches(matches, 3);
      
      // Add finals match
      const updatedMatches = linker.generateFinals(matches);
      
      // Verify the bracket structure
      // 1. Check winners bracket links
      const winnerR1M1 = matches.find(m => m.matchType === 'winners' && m.round === 1 && m.position === 1)!;
      const winnerR1M2 = matches.find(m => m.matchType === 'winners' && m.round === 1 && m.position === 2)!;
      const winnerR2M1 = matches.find(m => m.matchType === 'winners' && m.round === 2 && m.position === 1)!;
      
      // Winner R1M1 should link to Winner R2M1
      expect(winnerR1M1.nextWinMatchId).toBe(winnerR2M1.id);
      
      // Winner R1M2 should also link to Winner R2M1
      expect(winnerR1M2.nextWinMatchId).toBe(winnerR2M1.id);
      
      // 2. Check losers bracket links
      const loserR1M1 = matches.find(m => m.matchType === 'losers' && m.round === 1 && m.position === 1)!;
      const loserR2M1 = matches.find(m => m.matchType === 'losers' && m.round === 2 && m.position === 1)!;
      
      expect(loserR1M1.nextWinMatchId).toBe(loserR2M1.id);
      
      // 3. Check finals links
      const winnersFinal = matches.find(m => m.matchType === 'winners' && m.round === 3 && m.position === 1)!;
      const losersFinal = matches.find(m => m.matchType === 'losers' && m.round === 5 && m.position === 1)!;
      const grandFinals = updatedMatches.find(m => m.matchType === 'finals' && m.round === 1)!;
      
      expect(winnersFinal.nextWinMatchId).toBe(grandFinals.id);
      expect(losersFinal.nextWinMatchId).toBe(grandFinals.id);
      
      // 4. Verify the total number of matches
      expect(updatedMatches.length).toBe(15); // 7 winners + 7 losers + 1 finals
      
      // 5. Verify reset match can be created
      const resetMatch = linker.createResetMatch();
      expect(resetMatch.round).toBe(2);
      expect(resetMatch.matchType).toBe('finals');
    });
  });
});
