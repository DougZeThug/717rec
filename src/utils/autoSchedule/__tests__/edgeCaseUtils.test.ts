
import { describe, it, expect } from 'vitest';
import { handleOddTeams, validateTeamCounts } from '../edgeCaseUtils';
import { createMockTimeBlockTeams } from '@/utils/test/autoSchedule/testHelpers';

describe('Edge Case Utils', () => {
  describe('handleOddTeams', () => {
    it('should not modify blocks with even team counts', () => {
      const timeBlocks = createMockTimeBlockTeams({ '6:30': 4, '7:30': 2 });
      const { adjustedTeams, unmatchedTeamIds } = handleOddTeams(timeBlocks);
      
      expect(adjustedTeams['6:30']).toHaveLength(4);
      expect(adjustedTeams['7:30']).toHaveLength(2);
      expect(unmatchedTeamIds).toHaveLength(0);
    });

    it('should exclude one team from blocks with odd team counts', () => {
      const timeBlocks = createMockTimeBlockTeams({ '6:30': 3, '7:30': 5 });
      const { adjustedTeams, unmatchedTeamIds } = handleOddTeams(timeBlocks);
      
      expect(adjustedTeams['6:30']).toHaveLength(2);
      expect(adjustedTeams['7:30']).toHaveLength(4);
      expect(unmatchedTeamIds).toHaveLength(2);
    });
    
    it('should handle mixed odd and even team counts', () => {
      const timeBlocks = createMockTimeBlockTeams({ '6:30': 3, '7:30': 2, '8:30': 5 });
      const { adjustedTeams, unmatchedTeamIds } = handleOddTeams(timeBlocks);
      
      expect(adjustedTeams['6:30']).toHaveLength(2);
      expect(adjustedTeams['7:30']).toHaveLength(2);
      expect(adjustedTeams['8:30']).toHaveLength(4);
      expect(unmatchedTeamIds).toHaveLength(2);
    });
  });

  describe('validateTeamCounts', () => {
    it('should validate blocks with sufficient teams', () => {
      const timeBlocks = createMockTimeBlockTeams({ '6:30': 4, '7:30': 2 });
      const result = validateTeamCounts(timeBlocks);
      
      expect(result.isValid).toBe(true);
      expect(result.insufficientBlocks).toHaveLength(0);
    });

    it('should identify blocks with insufficient teams', () => {
      const timeBlocks = createMockTimeBlockTeams({ '6:30': 1, '7:30': 0, '8:30': 2 });
      const result = validateTeamCounts(timeBlocks);
      
      expect(result.isValid).toBe(false);
      expect(result.insufficientBlocks).toContain('6:30');
      expect(result.insufficientBlocks).toContain('7:30');
      expect(result.insufficientBlocks).not.toContain('8:30');
    });
  });
});
