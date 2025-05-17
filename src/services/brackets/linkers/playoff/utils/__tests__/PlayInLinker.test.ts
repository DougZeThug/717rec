
import { describe, it, expect } from 'vitest';
import { nanoid } from 'nanoid';
import { PlayoffMatch, PlayoffMatchType } from '../../../../types';
import { PlayInLinker } from '../PlayInLinker';

describe('PlayInLinker', () => {
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
  
  describe('linkPlayInMatches', () => {
    it('should link play-in matches to first round winners matches', () => {
      const playInMatch1 = createTestMatch(0, 1, 'play-in');
      const playInMatch2 = createTestMatch(0, 2, 'play-in');
      
      // Create first round matches with placeholders for play-in winners
      const firstRoundMatch1 = {
        ...createTestMatch(1, 1, 'winners'),
        team1Id: `play-in-1`
      };
      
      const firstRoundMatch2 = {
        ...createTestMatch(1, 2, 'winners'),
        team2Id: `play-in-2`
      };
      
      const matches = [
        playInMatch1,
        playInMatch2,
        firstRoundMatch1,
        firstRoundMatch2,
        createTestMatch(1, 3, 'winners') // Not linked to play-in
      ];
      
      PlayInLinker.linkPlayInMatches(matches);
      
      expect(playInMatch1.nextWinMatchId).toBe(firstRoundMatch1.id);
      expect(playInMatch2.nextWinMatchId).toBe(firstRoundMatch2.id);
    });
    
    it('should handle play-in-2 type matches', () => {
      const playInMatch = createTestMatch(0, 1, 'play-in-2');
      
      const firstRoundMatch = {
        ...createTestMatch(1, 1, 'winners'),
        team1Id: `play-in-1`
      };
      
      const matches = [playInMatch, firstRoundMatch];
      
      PlayInLinker.linkPlayInMatches(matches);
      
      expect(playInMatch.nextWinMatchId).toBe(firstRoundMatch.id);
    });
    
    it('should not link if no matching target is found', () => {
      const playInMatch = createTestMatch(0, 3, 'play-in');
      const firstRoundMatch = createTestMatch(1, 1, 'winners');
      
      const matches = [playInMatch, firstRoundMatch];
      
      PlayInLinker.linkPlayInMatches(matches);
      
      expect(playInMatch.nextWinMatchId).toBeNull();
    });
  });
});
