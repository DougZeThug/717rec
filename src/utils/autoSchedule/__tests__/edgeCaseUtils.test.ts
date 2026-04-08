import { describe, expect, it } from 'vitest';

import { createMockTeam, createMockTimeBlockTeams } from '@/utils/test/autoSchedule/testHelpers';

import {
  generateTeamDistributionSummary,
  getRecommendedTeamCount,
  handleOddTeams,
  validateBackToBackPairAssignments,
  validateTeamCounts,
} from '../edgeCaseUtils';

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

  describe('generateTeamDistributionSummary', () => {
    it('calculates correct totals for even blocks (happy path)', () => {
      const timeBlocks = createMockTimeBlockTeams({ Early: 4, Mid: 2 });
      const result = generateTeamDistributionSummary(timeBlocks);

      expect(result.totalTeams).toBe(6);
      expect(result.totalMatches).toBe(3); // 4/2 + 2/2
      expect(result.unpairedTeams).toBe(0);
      expect(result.pairSummary).toHaveLength(2);
    });

    it('identifies an odd block in pairSummary', () => {
      const timeBlocks = createMockTimeBlockTeams({ Early: 3 });
      const result = generateTeamDistributionSummary(timeBlocks);

      expect(result.unpairedTeams).toBe(1);
      expect(result.pairSummary[0].hasOddTeams).toBe(true);
      expect(result.pairSummary[0].matchCount).toBe(1); // floor(3/2)
    });

    it('returns zeroed totals for empty input', () => {
      const result = generateTeamDistributionSummary({});

      expect(result.totalTeams).toBe(0);
      expect(result.totalMatches).toBe(0);
      expect(result.unpairedTeams).toBe(0);
      expect(result.pairSummary).toHaveLength(0);
    });
  });

  describe('validateBackToBackPairAssignments', () => {
    it('returns isValid=true for a known pair name with even team count (happy path)', () => {
      const t1 = createMockTeam({ id: 't1' });
      const t2 = createMockTeam({ id: 't2' });
      const t3 = createMockTeam({ id: 't3' });
      const t4 = createMockTeam({ id: 't4' });
      const timeBlocks = { SuperEarly: [t1, t2, t3, t4] };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns isValid=false for an unknown pair name', () => {
      const t1 = createMockTeam({ id: 't1' });
      const t2 = createMockTeam({ id: 't2' });
      const timeBlocks = { InvalidBlock: [t1, t2, t1, t2] };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid pair name'))).toBe(true);
    });

    it('adds warning when pair has fewer than 4 teams', () => {
      const t1 = createMockTeam({ id: 't1' });
      const t2 = createMockTeam({ id: 't2' });
      const timeBlocks = { Early: [t1, t2] };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.isValid).toBe(true); // warning, not error
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('adds warning when pair has an odd number of teams', () => {
      const t1 = createMockTeam({ id: 't1' });
      const t2 = createMockTeam({ id: 't2' });
      const t3 = createMockTeam({ id: 't3' });
      const timeBlocks = { Mid: [t1, t2, t3] };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.warnings.some((w) => w.toLowerCase().includes('odd'))).toBe(true);
    });

    it('errors on duplicate teams within a block', () => {
      const t1 = createMockTeam({ id: 't1' });
      const t2 = createMockTeam({ id: 't2' });
      const timeBlocks = { Early: [t1, t1, t2, t2] }; // t1 and t2 each duplicated

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.toLowerCase().includes('duplicate'))).toBe(true);
    });

    it('errors when the same team is assigned to multiple blocks', () => {
      const sharedTeam = createMockTeam({ id: 'shared' });
      const t2 = createMockTeam({ id: 't2' });
      const t3 = createMockTeam({ id: 't3' });
      const t4 = createMockTeam({ id: 't4' });
      const timeBlocks = {
        Early: [sharedTeam, t2, t3, t4],
        Mid: [sharedTeam, t2, t3, t4], // sharedTeam appears again
      };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.isValid).toBe(false);
    });

    it('adds warning when block has no teams', () => {
      const timeBlocks = { Early: [] };

      const result = validateBackToBackPairAssignments(timeBlocks);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedTeamCount', () => {
    it('returns 4 for 0 or negative input', () => {
      expect(getRecommendedTeamCount(0)).toBe(4);
      expect(getRecommendedTeamCount(-1)).toBe(4);
    });

    it('returns same value for an even count', () => {
      expect(getRecommendedTeamCount(4)).toBe(4);
      expect(getRecommendedTeamCount(6)).toBe(6);
    });

    it('rounds up odd count to next even number', () => {
      expect(getRecommendedTeamCount(3)).toBe(4);
      expect(getRecommendedTeamCount(5)).toBe(6);
      expect(getRecommendedTeamCount(7)).toBe(8);
    });
  });
});
