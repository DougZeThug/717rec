import { describe, expect, it } from 'vitest';

import {
  formatBreakdown,
  formatProbability,
  isUpset,
  predictMatch,
  UPSET_THRESHOLD,
} from '../predictMatch';
import type { TeamStats } from '../predictMatch';

// Helper to create team stats
const createTeamStats = (
  powerScore: number | null,
  sos: number | null,
  divisionId: string | null = null
): TeamStats => ({
  power_score: powerScore,
  sos: sos,
  division_id: divisionId,
});

// Mock division weights map
const createDivisionWeights = (): Map<string, number> => {
  const weights = new Map<string, number>();
  weights.set('div-high', 1.2);    // High-tier division
  weights.set('div-mid', 1.0);     // Mid-tier division
  weights.set('div-low', 0.8);     // Low-tier division
  return weights;
};

describe('predictMatch', () => {
  describe('equal teams', () => {
    it('should return ~50/50 for teams with identical stats', () => {
      const teamA = createTeamStats(50, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Should be very close to 50%
      expect(result.probA).toBeCloseTo(0.5, 1);
      expect(result.probB).toBeCloseTo(0.5, 1);
      expect(result.probA + result.probB).toBeCloseTo(1.0, 5);
      expect(result.expectedText).toBe('Near coin flip');
      expect(result.confidence).toBe('Low');
    });

    it('should return ~50/50 when both teams have null stats', () => {
      const teamA = createTeamStats(null, null, null);
      const teamB = createTeamStats(null, null, null);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.probA).toBeCloseTo(0.5, 1);
      expect(result.probB).toBeCloseTo(0.5, 1);
    });
  });

  describe('Power Score dominance', () => {
    it('should favor the team with higher Power Score', () => {
      const teamA = createTeamStats(70, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      expect(result.probA).toBeGreaterThan(0.5);
      expect(result.probB).toBeLessThan(0.5);
      expect(result.expectedText).toContain('Team A');
    });

    it('Power Score should outweigh modest SOS differences', () => {
      // Team A: higher power score, lower SOS
      // Team B: lower power score, higher SOS
      const teamA = createTeamStats(65, 0.70, 'div-mid');
      const teamB = createTeamStats(55, 0.95, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Team A should still be favored due to higher power score
      expect(result.probA).toBeGreaterThan(0.5);
    });

    it('Power Score should outweigh modest division weight differences', () => {
      // Team A: higher power score, lower division
      // Team B: lower power score, higher division
      const teamA = createTeamStats(70, 0.85, 'div-low');
      const teamB = createTeamStats(55, 0.85, 'div-high');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Team A should still be favored due to higher power score
      expect(result.probA).toBeGreaterThan(0.5);
    });
  });

  describe('large rating gaps produce lopsided probabilities', () => {
    it('should produce high probability for dominant team', () => {
      const teamA = createTeamStats(85, 1.0, 'div-high');
      const teamB = createTeamStats(35, 0.7, 'div-low');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Should be heavily lopsided
      expect(result.probA).toBeGreaterThan(0.75);
      expect(result.probB).toBeLessThan(0.25);
      expect(result.confidence).toBe('High');
      expect(result.expectedText).toContain('strongly favored');
    });

    it('should not clamp probabilities - allow very lopsided odds', () => {
      const teamA = createTeamStats(95, 1.1, 'div-high');
      const teamB = createTeamStats(25, 0.6, 'div-low');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Should allow 85-15 or more extreme
      expect(result.probA).toBeGreaterThan(0.8);
      // Probabilities should still sum to 1
      expect(result.probA + result.probB).toBeCloseTo(1.0, 5);
    });
  });

  describe('confidence levels', () => {
    it('should return Low confidence for near coin flip (50-56%)', () => {
      const teamA = createTeamStats(52, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.confidence).toBe('Low');
    });

    it('should return Medium confidence for moderate favorites (56-65%)', () => {
      const teamA = createTeamStats(60, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.confidence).toBe('Medium');
    });

    it('should return High confidence for strong favorites (65%+)', () => {
      const teamA = createTeamStats(75, 0.95, 'div-high');
      const teamB = createTeamStats(45, 0.75, 'div-low');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.confidence).toBe('High');
    });
  });

  describe('expected text', () => {
    it('should show "Near coin flip" when probability is within 3% of 50%', () => {
      const teamA = createTeamStats(50.5, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.expectedText).toBe('Near coin flip');
    });

    it('should show "[Team] favored" for moderate favorites', () => {
      const teamA = createTeamStats(60, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toBe('Alpha favored');
    });

    it('should show "[Team] strongly favored" for dominant favorites (70%+)', () => {
      const teamA = createTeamStats(80, 1.0, 'div-high');
      const teamB = createTeamStats(40, 0.7, 'div-low');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toBe('Alpha strongly favored');
    });

    it('should favor Team B when B has better stats', () => {
      const teamA = createTeamStats(40, 0.7, 'div-low');
      const teamB = createTeamStats(75, 1.0, 'div-high');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toContain('Beta');
    });
  });

  describe('breakdown values', () => {
    it('should include all breakdown values', () => {
      const teamA = createTeamStats(65, 0.9, 'div-high');
      const teamB = createTeamStats(55, 0.8, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.breakdown.powerScoreA).toBe(65);
      expect(result.breakdown.powerScoreB).toBe(55);
      expect(result.breakdown.sosA).toBe(0.9);
      expect(result.breakdown.sosB).toBe(0.8);
      expect(result.breakdown.divisionWeightA).toBe(1.2);
      expect(result.breakdown.divisionWeightB).toBe(1.0);
      expect(result.breakdown.teamRatingA).toBeGreaterThan(0);
      expect(result.breakdown.teamRatingB).toBeGreaterThan(0);
      expect(typeof result.breakdown.ratingDiff).toBe('number');
    });

    it('should use default values when stats are null', () => {
      const teamA = createTeamStats(null, null, null);
      const teamB = createTeamStats(null, null, null);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      // Should use defaults: power_score=50, sos=0.85, div_weight=0.85
      expect(result.breakdown.powerScoreA).toBe(50);
      expect(result.breakdown.powerScoreB).toBe(50);
      expect(result.breakdown.sosA).toBe(0.85);
      expect(result.breakdown.sosB).toBe(0.85);
      expect(result.breakdown.divisionWeightA).toBe(0.85);
      expect(result.breakdown.divisionWeightB).toBe(0.85);
    });
  });
});

describe('isUpset', () => {
  it('should return true when winner probability <= threshold', () => {
    expect(isUpset(0.20)).toBe(true);
    expect(isUpset(0.25)).toBe(true);
    expect(isUpset(UPSET_THRESHOLD)).toBe(true);
  });

  it('should return false when winner probability > threshold', () => {
    expect(isUpset(0.35)).toBe(false);
    expect(isUpset(0.50)).toBe(false);
    expect(isUpset(0.75)).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isUpset(0)).toBe(true);
    expect(isUpset(1)).toBe(false);
  });
});

describe('formatProbability', () => {
  it('should format probabilities as percentages', () => {
    expect(formatProbability(0.5)).toBe('50%');
    expect(formatProbability(0.72)).toBe('72%');
    expect(formatProbability(0.333)).toBe('33%');
    expect(formatProbability(0.999)).toBe('100%');
    expect(formatProbability(0.001)).toBe('0%');
  });
});

describe('formatBreakdown', () => {
  it('should format breakdown as readable string', () => {
    const breakdown = {
      powerScoreA: 65,
      powerScoreB: 55,
      sosA: 0.9,
      sosB: 0.8,
      divisionWeightA: 1.1,
      divisionWeightB: 0.95,
      teamRatingA: 0.6,
      teamRatingB: 0.5,
      ratingDiff: 0.1,
    };

    const formatted = formatBreakdown(breakdown);

    expect(formatted).toContain('Power 65 vs 55');
    expect(formatted).toContain('SOS 0.90 vs 0.80');
    expect(formatted).toContain('Div 1.10 vs 0.95');
  });
});
