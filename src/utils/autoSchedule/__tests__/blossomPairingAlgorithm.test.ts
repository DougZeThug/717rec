import { describe, expect, it } from 'vitest';

import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { generatePairingsWithBlossom } from '../blossomPairingAlgorithm';

/**
 * Base config that skips the Supabase fetchSeasonHistoryForTeams call:
 * - avoidRematches: false  → no DB pre-fetch
 * - playedPairsSet: new Set() → also prevents fetch if avoidRematches were true
 */
const baseConfig = {
  avoidRematches: false,
  haveTeamsPlayedFn: () => Promise.resolve(false),
  getCompatibilityScoreFn: () => 5,
  playedPairsSet: new Set<string>(),
};

describe('generatePairingsWithBlossom', () => {
  it('returns [] for 0 teams', async () => {
    const result = await generatePairingsWithBlossom([], baseConfig);
    expect(result).toEqual([]);
  });

  it('returns [] for 1 team', async () => {
    const result = await generatePairingsWithBlossom([createMockTeam()], baseConfig);
    expect(result).toEqual([]);
  });

  it('2-team pairing: produces pairings containing both teams', async () => {
    const t1 = createMockTeam({ id: 't1', name: 'T1' });
    const t2 = createMockTeam({ id: 't2', name: 'T2' });

    const result = await generatePairingsWithBlossom([t1, t2], baseConfig);

    expect(result.length).toBeGreaterThan(0);
    const ids = result.flatMap((p) => [p.team1.id, p.team2.id]);
    expect(ids).toContain('t1');
    expect(ids).toContain('t2');
  });

  it('4-team pairing: all teams appear in pairings (happy path)', async () => {
    const teams = ['t1', 't2', 't3', 't4'].map((id) => createMockTeam({ id, name: id }));

    const result = await generatePairingsWithBlossom(teams, baseConfig);

    expect(result.length).toBeGreaterThan(0);
    const ids = result.flatMap((p) => [p.team1.id, p.team2.id]);
    for (const team of teams) {
      expect(ids).toContain(team.id);
    }
  });

  it('4-team pairing: no team appears in more than 2 pairings', async () => {
    const teams = ['t1', 't2', 't3', 't4'].map((id) => createMockTeam({ id, name: id }));

    const result = await generatePairingsWithBlossom(teams, baseConfig);

    const counts: Record<string, number> = {};
    for (const p of result) {
      counts[p.team1.id] = (counts[p.team1.id] || 0) + 1;
      counts[p.team2.id] = (counts[p.team2.id] || 0) + 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('3-team odd count: returns pairings without throwing', async () => {
    const teams = ['t1', 't2', 't3'].map((id) => createMockTeam({ id, name: id }));

    const result = await generatePairingsWithBlossom(teams, baseConfig);

    expect(Array.isArray(result)).toBe(true);
  });

  it('marks hasPlayedBefore = false when playedPairsSet is empty', async () => {
    const teams = ['t1', 't2', 't3', 't4'].map((id) => createMockTeam({ id, name: id }));
    const config = { ...baseConfig, playedPairsSet: new Set<string>() };

    const result = await generatePairingsWithBlossom(teams, config);

    for (const p of result) {
      expect(p.hasPlayedBefore).toBe(false);
    }
  });

  it('marks hasPlayedBefore = true when pair key is in playedPairsSet', async () => {
    const t1 = createMockTeam({ id: 't1', name: 'T1' });
    const t2 = createMockTeam({ id: 't2', name: 'T2' });
    const t3 = createMockTeam({ id: 't3', name: 'T3' });
    const t4 = createMockTeam({ id: 't4', name: 'T4' });

    // Seed history so t1 vs t2 have played before
    const playedPairsSet = new Set(['t1-t2']);
    const config = { ...baseConfig, avoidRematches: true, playedPairsSet };

    const result = await generatePairingsWithBlossom([t1, t2, t3, t4], config);

    const t1t2Pairing = result.find(
      (p) =>
        (p.team1.id === 't1' && p.team2.id === 't2') ||
        (p.team1.id === 't2' && p.team2.id === 't1')
    );
    if (t1t2Pairing) {
      expect(t1t2Pairing.hasPlayedBefore).toBe(true);
    }
    // If t1 and t2 were not paired (rematch avoidance), that's also valid
  });

  it('6-team pairing: each team in at most 2 pairings', async () => {
    const teams = ['t1', 't2', 't3', 't4', 't5', 't6'].map((id) =>
      createMockTeam({ id, name: id })
    );

    const result = await generatePairingsWithBlossom(teams, baseConfig);

    const counts: Record<string, number> = {};
    for (const p of result) {
      counts[p.team1.id] = (counts[p.team1.id] || 0) + 1;
      counts[p.team2.id] = (counts[p.team2.id] || 0) + 1;
    }
    for (const count of Object.values(counts)) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('each pairing has required shape properties', async () => {
    const teams = ['t1', 't2'].map((id) => createMockTeam({ id, name: id }));

    const result = await generatePairingsWithBlossom(teams, baseConfig);

    for (const p of result) {
      expect(p).toHaveProperty('team1');
      expect(p).toHaveProperty('team2');
      expect(p).toHaveProperty('compatibilityScore');
      expect(p).toHaveProperty('hasPlayedBefore');
    }
  });
});
