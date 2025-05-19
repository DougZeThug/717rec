
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createSingleElimStage, 
  createDoubleElimStage, 
  mapBracketsToAppFormat 
} from '../BracketsService';
import { Team } from '@/types';

// Mock the supabase client and brackets-manager
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({ error: null }),
    update: vi.fn().mockReturnValue({ error: null }),
    delete: vi.fn().mockReturnValue({ error: null }),
  }
}));

vi.mock('brackets-manager', () => ({
  BracketsManager: class MockBracketsManager {
    constructor() {}
    create = {
      stage: vi.fn().mockResolvedValue(true)
    };
    participant = {
      bulkInsert: vi.fn().mockResolvedValue(true)
    };
    match = {
      update: vi.fn().mockResolvedValue(true),
      select: vi.fn().mockResolvedValue([])
    };
  }
}));

describe('BracketsService', () => {
  const mockTeams: Team[] = [
    { id: '1', name: 'Team 1', seed: 1 },
    { id: '2', name: 'Team 2', seed: 2 },
    { id: '3', name: 'Team 3', seed: 3 },
    { id: '4', name: 'Team 4', seed: 4 }
  ];

  describe('createSingleElimStage', () => {
    it('should create a single elimination stage', async () => {
      await expect(
        createSingleElimStage('bracket-1', 'Test Bracket', mockTeams)
      ).resolves.not.toThrow();
    });
  });

  describe('createDoubleElimStage', () => {
    it('should create a double elimination stage', async () => {
      await expect(
        createDoubleElimStage('bracket-1', 'Test Bracket', mockTeams)
      ).resolves.not.toThrow();
    });
  });

  describe('mapBracketsToAppFormat', () => {
    it('should correctly map brackets matches to app format', () => {
      const mockMatches = [
        {
          id: 'm1',
          round: 1,
          position: 1,
          group: 'WINNER',
          opponent1: { id: '1', position: 1, result: 'win', score: 2 },
          opponent2: { id: '2', position: 2, result: 'loss', score: 1 },
          child_match_id: 'm3',
          child_match_id_loser: 'm5',
          best_of: 3
        },
        {
          id: 'm2',
          round: 1,
          position: 2,
          group: 'WINNER',
          opponent1: { id: '3', position: 3, result: 'loss', score: 0 },
          opponent2: { id: '4', position: 4, result: 'win', score: 2 },
          child_match_id: 'm3',
          child_match_id_loser: null,
          best_of: 3
        },
        {
          id: 'm3',
          round: 2,
          position: 1,
          group: 'FINAL',
          opponent1: { id: '1', position: null, result: null, score: null },
          opponent2: { id: '4', position: null, result: null, score: null },
          child_match_id: null,
          child_match_id_loser: null,
          best_of: 3
        }
      ];

      const result = mapBracketsToAppFormat('bracket-1', mockMatches);
      
      // Check structure
      expect(result).toHaveProperty('winners');
      expect(result).toHaveProperty('losers');
      expect(result).toHaveProperty('finals');
      
      // Check content
      expect(result.winners[0].length).toBe(2);
      expect(result.finals.length).toBe(1);
      
      // Check a specific match mapping
      const winnerMatch = result.winners[0][0];
      expect(winnerMatch.id).toBe('m1');
      expect(winnerMatch.team1Id).toBe('1');
      expect(winnerMatch.team2Id).toBe('2');
      expect(winnerMatch.winnerId).toBe('1');
      expect(winnerMatch.nextWinMatchId).toBe('m3');
      expect(winnerMatch.nextLoseMatchId).toBe('m5');
      expect(winnerMatch.bracket_id).toBe('bracket-1');
    });
  });
});
