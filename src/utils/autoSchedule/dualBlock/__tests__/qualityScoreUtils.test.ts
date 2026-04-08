import { describe, expect, it } from 'vitest';

import { calculateOverallQualityScore } from '../qualityScoreUtils';

const perfectMetrics = {
  crossBlockCompatibility: 10, // → crossBlockScore = 100
  teamsWithBothMatches: 4,
  teamsWithDuplicateOpponents: 0,
  totalTeams: 4,
  averageCompatibilityScore: 10, // → compatibilityScore = 100
  blockBalanceScore: 100,
};

describe('calculateOverallQualityScore', () => {
  it('returns 100 for perfect metrics (happy path)', () => {
    // (100*0.3) + (100*0.2) + (100*0.3) + (100*0.2) = 100
    const result = calculateOverallQualityScore(perfectMetrics);
    expect(result).toBe(100);
  });

  it('returns 0 for worst-case metrics', () => {
    const result = calculateOverallQualityScore({
      crossBlockCompatibility: 0,
      teamsWithBothMatches: 0,
      teamsWithDuplicateOpponents: 4,
      totalTeams: 4,
      averageCompatibilityScore: 0,
      blockBalanceScore: 0,
    });
    // crossBlockScore=0, duplicateScore=0, compatibilityScore=0, blockBalance=0
    expect(result).toBe(0);
  });

  it('handles totalTeams = 0 without dividing by zero', () => {
    const result = calculateOverallQualityScore({
      ...perfectMetrics,
      totalTeams: 0,
      teamsWithDuplicateOpponents: 0,
    });
    // duplicateScore falls back to 100 per source code
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('duplicate penalty reduces score proportionally', () => {
    // 2 of 4 teams have duplicates → duplicateScore = 100 - (2/4)*100 = 50
    // weighted: 50*0.2 = 10 reduction → 90
    const result = calculateOverallQualityScore({
      ...perfectMetrics,
      teamsWithDuplicateOpponents: 2,
      totalTeams: 4,
    });
    expect(result).toBe(90);
  });

  it('caps averageCompatibilityScore above 10 at 100', () => {
    const withOverflow = calculateOverallQualityScore({
      ...perfectMetrics,
      averageCompatibilityScore: 15,
    });
    const withMax = calculateOverallQualityScore({
      ...perfectMetrics,
      averageCompatibilityScore: 10,
    });
    expect(withOverflow).toBe(withMax);
  });

  it('always returns a rounded integer', () => {
    const result = calculateOverallQualityScore({
      crossBlockCompatibility: 7,
      teamsWithBothMatches: 3,
      teamsWithDuplicateOpponents: 1,
      totalTeams: 4,
      averageCompatibilityScore: 7.5,
      blockBalanceScore: 75,
    });
    expect(Number.isInteger(result)).toBe(true);
  });

  it('result is always between 0 and 100', () => {
    const cases = [
      { crossBlockCompatibility: 5, teamsWithBothMatches: 2, teamsWithDuplicateOpponents: 1, totalTeams: 4, averageCompatibilityScore: 6, blockBalanceScore: 50 },
      { crossBlockCompatibility: 0, teamsWithBothMatches: 0, teamsWithDuplicateOpponents: 0, totalTeams: 2, averageCompatibilityScore: 0, blockBalanceScore: 0 },
      { crossBlockCompatibility: 10, teamsWithBothMatches: 6, teamsWithDuplicateOpponents: 0, totalTeams: 6, averageCompatibilityScore: 9, blockBalanceScore: 100 },
    ];
    for (const input of cases) {
      const result = calculateOverallQualityScore(input);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    }
  });
});
