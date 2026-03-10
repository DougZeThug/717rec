import { describe, expect, it } from 'vitest';

import type { TeamStats } from '../predictMatch';
import {
  formatBreakdown,
  formatProbability,
  isUpset,
  predictMatch,
  UPSET_THRESHOLD,
} from '../predictMatch';

// Helper to create team stats
const createTeamStats = (
  powerScore: number | null,
  sos: number | null,
  divisionId: string | null = null,
  careerPowerScore: number | null = null,
  careerSos: number | null = null,
  careerWinPercentage: number | null = null
): TeamStats => ({
  power_score: powerScore,
  sos: sos,
  division_id: divisionId,
  career_power_score: careerPowerScore,
  career_sos: careerSos,
  career_win_percentage: careerWinPercentage,
});

// Mock division weights map
const createDivisionWeights = (): Map<string, number> => {
  const weights = new Map<string, number>();
  weights.set('div-high', 1.2); // High-tier division
  weights.set('div-mid', 1.0); // Mid-tier division
  weights.set('div-low', 0.8); // Low-tier division
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

  describe('Career stats influence', () => {
    it('should favor the team with stronger career stats when season stats are equal', () => {
      // Same season stats, but Team A has better career
      const teamA = createTeamStats(50, 0.85, 'div-mid', 70, 0.9, 0.65);
      const teamB = createTeamStats(50, 0.85, 'div-mid', 45, 0.8, 0.45);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      expect(result.probA).toBeGreaterThan(0.5);
      expect(result.probB).toBeLessThan(0.5);
      expect(result.expectedText).toContain('Team A');
    });

    it('career stats should outweigh current season stats (65-35 split)', () => {
      // Team A: better season, worse career
      // Team B: worse season, better career
      const teamA = createTeamStats(65, 0.9, 'div-mid', 40, 0.75, 0.4);
      const teamB = createTeamStats(55, 0.85, 'div-mid', 75, 0.95, 0.7);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Team B should be favored due to stronger career (65% weight)
      expect(result.probB).toBeGreaterThan(0.5);
    });

    it('should fallback to season-only when no career data', () => {
      const teamA = createTeamStats(70, 0.85, 'div-mid'); // No career data
      const teamB = createTeamStats(50, 0.85, 'div-mid'); // No career data
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Team A should be favored by season stats
      expect(result.probA).toBeGreaterThan(0.5);
      expect(result.breakdown.hasCareerDataA).toBe(false);
      expect(result.breakdown.hasCareerDataB).toBe(false);
    });
  });

  describe('Power Score influence', () => {
    it('should favor the team with higher Power Score (when no career data)', () => {
      const teamA = createTeamStats(70, 0.85, 'div-mid');
      const teamB = createTeamStats(50, 0.85, 'div-mid');
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      expect(result.probA).toBeGreaterThan(0.5);
      expect(result.probB).toBeLessThan(0.5);
      expect(result.expectedText).toContain('Team A');
    });
  });

  describe('large rating gaps produce lopsided probabilities', () => {
    it('should produce high probability for dominant team', () => {
      const teamA = createTeamStats(85, 1.0, 'div-high', 80, 0.95, 0.75);
      const teamB = createTeamStats(35, 0.7, 'div-low', 40, 0.7, 0.35);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Team A', 'Team B');

      // Should be heavily lopsided
      expect(result.probA).toBeGreaterThan(0.75);
      expect(result.probB).toBeLessThan(0.25);
      expect(result.confidence).toBe('High');
      expect(result.expectedText).toContain('strongly favored');
    });

    it('should not clamp probabilities - allow very lopsided odds', () => {
      const teamA = createTeamStats(95, 1.1, 'div-high', 90, 1.05, 0.85);
      const teamB = createTeamStats(25, 0.6, 'div-low', 30, 0.65, 0.25);
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
      const teamA = createTeamStats(60, 0.85, 'div-mid', 60, 0.85, 0.55);
      const teamB = createTeamStats(50, 0.85, 'div-mid', 50, 0.85, 0.5);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      expect(result.confidence).toBe('Medium');
    });

    it('should return High confidence for strong favorites (65%+)', () => {
      const teamA = createTeamStats(75, 0.95, 'div-high', 80, 1.0, 0.7);
      const teamB = createTeamStats(45, 0.75, 'div-low', 40, 0.7, 0.35);
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
      const teamA = createTeamStats(60, 0.85, 'div-mid', 65, 0.9, 0.6);
      const teamB = createTeamStats(50, 0.85, 'div-mid', 50, 0.85, 0.5);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toBe('Alpha favored');
    });

    it('should show "[Team] strongly favored" for dominant favorites (70%+)', () => {
      const teamA = createTeamStats(80, 1.0, 'div-high', 85, 1.0, 0.75);
      const teamB = createTeamStats(40, 0.7, 'div-low', 40, 0.7, 0.35);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toBe('Alpha strongly favored');
    });

    it('should favor Team B when B has better stats', () => {
      const teamA = createTeamStats(40, 0.7, 'div-low', 35, 0.7, 0.35);
      const teamB = createTeamStats(75, 1.0, 'div-high', 80, 1.0, 0.75);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights, 'Alpha', 'Beta');

      expect(result.expectedText).toContain('Beta');
    });
  });

  describe('breakdown values', () => {
    it('should include all breakdown values including career', () => {
      const teamA = createTeamStats(65, 0.9, 'div-high', 70, 0.95, 0.65);
      const teamB = createTeamStats(55, 0.8, 'div-mid', 60, 0.85, 0.55);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      // Current season
      expect(result.breakdown.powerScoreA).toBe(65);
      expect(result.breakdown.powerScoreB).toBe(55);
      expect(result.breakdown.sosA).toBe(0.9);
      expect(result.breakdown.sosB).toBe(0.8);
      expect(result.breakdown.divisionWeightA).toBe(1.2);
      expect(result.breakdown.divisionWeightB).toBe(1.0);

      // Career
      expect(result.breakdown.careerPowerA).toBe(70);
      expect(result.breakdown.careerPowerB).toBe(60);
      expect(result.breakdown.careerSosA).toBe(0.95);
      expect(result.breakdown.careerSosB).toBe(0.85);
      expect(result.breakdown.careerWinPctA).toBe(0.65);
      expect(result.breakdown.careerWinPctB).toBe(0.55);

      // Ratings
      expect(result.breakdown.teamRatingA).toBeGreaterThan(0);
      expect(result.breakdown.teamRatingB).toBeGreaterThan(0);
      expect(typeof result.breakdown.ratingDiff).toBe('number');

      // Flags
      expect(result.breakdown.hasCareerDataA).toBe(true);
      expect(result.breakdown.hasCareerDataB).toBe(true);
    });

    it('should use default values when stats are null', () => {
      const teamA = createTeamStats(null, null, null);
      const teamB = createTeamStats(null, null, null);
      const weights = createDivisionWeights();

      const result = predictMatch(teamA, teamB, weights);

      // Should use defaults
      expect(result.breakdown.powerScoreA).toBe(50);
      expect(result.breakdown.powerScoreB).toBe(50);
      expect(result.breakdown.sosA).toBe(0.85);
      expect(result.breakdown.sosB).toBe(0.85);
      expect(result.breakdown.divisionWeightA).toBe(0.85);
      expect(result.breakdown.divisionWeightB).toBe(0.85);

      // Career defaults
      expect(result.breakdown.careerPowerA).toBe(50);
      expect(result.breakdown.careerPowerB).toBe(50);
      expect(result.breakdown.careerWinPctA).toBe(0.5);
      expect(result.breakdown.careerWinPctB).toBe(0.5);

      // No career data flags
      expect(result.breakdown.hasCareerDataA).toBe(false);
      expect(result.breakdown.hasCareerDataB).toBe(false);
    });
  });
});

describe('isUpset', () => {
  it('should return true when winner probability <= threshold', () => {
    expect(isUpset(0.2)).toBe(true);
    expect(isUpset(0.25)).toBe(true);
    expect(isUpset(UPSET_THRESHOLD)).toBe(true);
  });

  it('should return false when winner probability > threshold', () => {
    expect(isUpset(0.35)).toBe(false);
    expect(isUpset(0.5)).toBe(false);
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
  it('should format breakdown with career stats when available', () => {
    const breakdown = {
      powerScoreA: 65,
      powerScoreB: 55,
      sosA: 0.9,
      sosB: 0.8,
      divisionWeightA: 1.1,
      divisionWeightB: 0.95,
      careerPowerA: 70,
      careerPowerB: 60,
      careerSosA: 0.95,
      careerSosB: 0.85,
      careerWinPctA: 0.65,
      careerWinPctB: 0.55,
      h2hWinsA: 3,
      h2hWinsB: 1,
      h2hTotalMatches: 4,
      h2hRatingA: 0.6,
      h2hRatingB: 0.4,
      h2hDominanceFactor: 0.5,
      hasH2HData: true,
      seasonRatingA: 0.5,
      seasonRatingB: 0.4,
      careerRatingA: 0.6,
      careerRatingB: 0.5,
      teamRatingA: 0.6,
      teamRatingB: 0.5,
      ratingDiff: 0.1,
      hasCareerDataA: true,
      hasCareerDataB: true,
    };

    const formatted = formatBreakdown(breakdown);

    expect(formatted).toContain('Season: 65 vs 55');
    expect(formatted).toContain('Career: 70 vs 60');
    expect(formatted).toContain('Win%: 65% vs 55%');
    expect(formatted).toContain('H2H: 3-1');
  });

  it('should only show season when no career data', () => {
    const breakdown = {
      powerScoreA: 65,
      powerScoreB: 55,
      sosA: 0.9,
      sosB: 0.8,
      divisionWeightA: 1.1,
      divisionWeightB: 0.95,
      careerPowerA: 50,
      careerPowerB: 50,
      careerSosA: 0.85,
      careerSosB: 0.85,
      careerWinPctA: 0.5,
      careerWinPctB: 0.5,
      h2hWinsA: 0,
      h2hWinsB: 0,
      h2hTotalMatches: 0,
      h2hRatingA: 0.5,
      h2hRatingB: 0.5,
      h2hDominanceFactor: 0,
      hasH2HData: false,
      seasonRatingA: 0.5,
      seasonRatingB: 0.4,
      careerRatingA: 0.5,
      careerRatingB: 0.5,
      teamRatingA: 0.5,
      teamRatingB: 0.4,
      ratingDiff: 0.1,
      hasCareerDataA: false,
      hasCareerDataB: false,
    };

    const formatted = formatBreakdown(breakdown);

    expect(formatted).toContain('Season: 65 vs 55');
    expect(formatted).not.toContain('Career:');
    expect(formatted).not.toContain('Win%:');
    expect(formatted).not.toContain('H2H:');
  });

  it('should show H2H record when sufficient matches exist', () => {
    const breakdown = {
      powerScoreA: 50,
      powerScoreB: 50,
      sosA: 0.85,
      sosB: 0.85,
      divisionWeightA: 1.0,
      divisionWeightB: 1.0,
      careerPowerA: 50,
      careerPowerB: 50,
      careerSosA: 0.85,
      careerSosB: 0.85,
      careerWinPctA: 0.5,
      careerWinPctB: 0.5,
      h2hWinsA: 5,
      h2hWinsB: 2,
      h2hTotalMatches: 7,
      h2hRatingA: 0.65,
      h2hRatingB: 0.35,
      h2hDominanceFactor: 0.43,
      hasH2HData: true,
      seasonRatingA: 0.5,
      seasonRatingB: 0.5,
      careerRatingA: 0.5,
      careerRatingB: 0.5,
      teamRatingA: 0.5,
      teamRatingB: 0.5,
      ratingDiff: 0,
      hasCareerDataA: false,
      hasCareerDataB: false,
    };

    const formatted = formatBreakdown(breakdown);

    expect(formatted).toContain('H2H: 5-2');
  });
});
