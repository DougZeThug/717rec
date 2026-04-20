import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { Team } from '@/types';
import { MatchQualityMetrics, TeamPairingMap } from '@/types/autoSchedule';

import {
  analyzeOpponentDiversity,
  analyzePowerScoreBalance,
  calculateComprehensiveQualityMetrics,
  generateQualityFeedback,
} from '../qualityAnalysis';

function makeTeam(id: string, power_score = 50): Team {
  return { id, name: `Team ${id}`, power_score } as Team;
}

function makePairing(t1: Team, t2: Team) {
  return { team1: t1, team2: t2, compatibilityScore: 5, hasPlayedBefore: false };
}

describe('analyzeOpponentDiversity', () => {
  it('returns 100 diversityScore for empty pairings', () => {
    const result = analyzeOpponentDiversity({});
    expect(result.diversityScore).toBe(100);
    expect(result.duplicateOpponents).toBe(0);
  });

  it('returns 100 diversityScore when all opponents are unique', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const pairings: TeamPairingMap = {
      Early: [makePairing(a, b)],
      Late: [makePairing(c, d)],
    };
    const result = analyzeOpponentDiversity(pairings);
    expect(result.diversityScore).toBe(100);
    expect(result.duplicateOpponents).toBe(0);
  });

  it('detects duplicate opponents', () => {
    const [a, b] = ['a', 'b'].map((id) => makeTeam(id));
    const pairings: TeamPairingMap = {
      Early: [makePairing(a, b)],
      Late: [makePairing(a, b)], // same pairing again
    };
    const result = analyzeOpponentDiversity(pairings);
    expect(result.duplicateOpponents).toBeGreaterThan(0);
    expect(result.diversityScore).toBeLessThan(100);
  });
});

describe('analyzePowerScoreBalance', () => {
  it('returns averagePowerScoreDifference of 0 for empty pairings', () => {
    const result = analyzePowerScoreBalance({});
    expect(result.averagePowerScoreDifference).toBe(0);
    expect(result.balancedMatches).toBe(0);
  });

  it('marks teams with equal power scores as balanced', () => {
    const [a, b] = [makeTeam('a', 60), makeTeam('b', 60)];
    const pairings: TeamPairingMap = { block: [makePairing(a, b)] };
    const result = analyzePowerScoreBalance(pairings);
    expect(result.balancedMatches).toBe(1);
    expect(result.unbalancedMatches).toBe(0);
    expect(result.averagePowerScoreDifference).toBe(0);
  });

  it('marks teams with large power score gap as unbalanced', () => {
    const [a, b] = [makeTeam('a', 30), makeTeam('b', 90)];
    const pairings: TeamPairingMap = { block: [makePairing(a, b)] };
    const result = analyzePowerScoreBalance(pairings);
    expect(result.unbalancedMatches).toBe(1);
    expect(result.balancedMatches).toBe(0);
  });
});

describe('calculateComprehensiveQualityMetrics', () => {
  it('returns a metrics object in correct shape', () => {
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => makeTeam(id));
    const pairings: TeamPairingMap = {
      block: [makePairing(a, b), makePairing(c, d)],
    };
    const metrics = calculateComprehensiveQualityMetrics(pairings);
    expect(metrics.totalMatches).toBe(2);
    expect(typeof metrics.averageCompatibilityScore).toBe('number');
    expect(['Excellent', 'Good', 'Fair', 'Poor']).toContain(metrics.qualityRating);
    expect(metrics.opponentDiversity).toBeDefined();
    expect(metrics.powerScoreAnalysis).toBeDefined();
    expect(metrics.feedback).toBeDefined();
  });

  it('returns 0 totalMatches for empty pairings', () => {
    const metrics = calculateComprehensiveQualityMetrics({});
    expect(metrics.totalMatches).toBe(0);
  });
});

describe('generateQualityFeedback', () => {
  const baseMetrics: MatchQualityMetrics = {
    totalMatches: 4,
    rematchCount: 0,
    averageCompatibilityScore: 8,
    qualityRating: 'Excellent',
    opponentDiversity: { duplicateOpponents: 0, uniqueOpponents: 8, diversityScore: 100 },
    powerScoreAnalysis: { averagePowerScoreDifference: 1, balancedMatches: 4, unbalancedMatches: 0 },
    performanceMetrics: { generationTimeMs: 100, algorithmsUsed: ['standard'], optimizationLevel: 'standard' },
    feedback: { strengths: [], improvements: [], recommendations: [] },
  };

  it('returns an object with strengths, improvements, recommendations arrays', () => {
    const result = generateQualityFeedback(baseMetrics);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.improvements)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('adds a strength when there are no rematches', () => {
    const result = generateQualityFeedback({ ...baseMetrics, rematchCount: 0 });
    expect(result.strengths.some((s) => s.includes('repeat'))).toBe(true);
  });

  it('adds an improvement when there are rematches', () => {
    const result = generateQualityFeedback({ ...baseMetrics, rematchCount: 2 });
    expect(result.improvements.some((i) => i.includes('repeat'))).toBe(true);
  });
});
