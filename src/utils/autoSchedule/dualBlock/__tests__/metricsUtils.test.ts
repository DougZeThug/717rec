import { describe, expect, it } from 'vitest';

import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

import { calculateDualBlockMetrics } from '../metricsUtils';

const t1 = createMockTeam({ id: 't1', name: 'T1' });
const t2 = createMockTeam({ id: 't2', name: 'T2' });
const t3 = createMockTeam({ id: 't3', name: 'T3' });
const t4 = createMockTeam({ id: 't4', name: 'T4' });

describe('calculateDualBlockMetrics', () => {
  it('returns zeroed metrics for empty arrays (edge)', () => {
    const result = calculateDualBlockMetrics([], []);

    expect(result.teamsWithBothMatches).toBe(0);
    expect(result.teamsWithSingleMatch).toBe(0);
    expect(result.teamsWithDuplicateOpponents).toBe(0);
    expect(result.averageCompatibilityScore).toBe(0);
    expect(result.overallQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.overallQualityScore).toBeLessThanOrEqual(100);
  });

  it('counts teamsWithSingleMatch when teams only appear in one block (happy path)', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t3, team2: t4 })];

    const result = calculateDualBlockMetrics(primary, secondary);

    // All 4 teams appear exactly once → single-match only
    expect(result.teamsWithBothMatches).toBe(0);
    expect(result.teamsWithSingleMatch).toBe(4);
    expect(result.teamsWithDuplicateOpponents).toBe(0);
  });

  it('counts teamsWithBothMatches when teams appear in both blocks', () => {
    // t1 plays t2 in primary and t3 in secondary → t1 has 2 matches
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t1, team2: t3 })];

    const result = calculateDualBlockMetrics(primary, secondary);

    // t1 appears in both → matchCount=2 → teamsWithBothMatches=1
    expect(result.teamsWithBothMatches).toBe(1);
  });

  it('detects duplicate opponents when same pairing appears in both blocks', () => {
    // t1 vs t2 in primary AND secondary → t1 and t2 each have matchCount=2 with duplicate opponent
    const pairing = createMockTeamPairing({ team1: t1, team2: t2 });
    const result = calculateDualBlockMetrics([pairing], [pairing]);

    expect(result.teamsWithDuplicateOpponents).toBeGreaterThan(0);
  });

  it('calculates averageCompatibilityScore as the mean of all pairings', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2, compatibilityScore: 8 })];
    const secondary = [createMockTeamPairing({ team1: t3, team2: t4, compatibilityScore: 6 })];

    const result = calculateDualBlockMetrics(primary, secondary);

    expect(result.averageCompatibilityScore).toBe(7); // (8 + 6) / 2
  });

  it('overallQualityScore is always between 0 and 100', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2, compatibilityScore: 5 })];
    const secondary = [createMockTeamPairing({ team1: t1, team2: t2, compatibilityScore: 5 })]; // duplicate

    const result = calculateDualBlockMetrics(primary, secondary);

    expect(result.overallQualityScore).toBeGreaterThanOrEqual(0);
    expect(result.overallQualityScore).toBeLessThanOrEqual(100);
  });

  it('crossBlockCompatibility is 0 when no team has 2 matches', () => {
    // Each team only appears once → teamCount=0 → crossBlockCompatibility=0
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t3, team2: t4 })];

    const result = calculateDualBlockMetrics(primary, secondary);

    expect(result.crossBlockCompatibility).toBe(0);
  });
});
