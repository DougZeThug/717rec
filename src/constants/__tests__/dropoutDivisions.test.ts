import { describe, expect, it } from 'vitest';

import { applyDropoutDivisions, DROPOUT_DIVISIONS } from '@/constants/dropoutDivisions';
import { categorizeDivision } from '@/utils/career/calculateDivisionRecords';
import type { DivisionTier } from '@/utils/career/types';
import { applyRealDivisions } from '@/utils/divisions/realDivisionOverrides';

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const KEY_FORMAT = new RegExp(`^${UUID}_${UUID}$`);

// Doug's 8 team-seasons (2026-11-16), written out here on purpose: the test
// checks the constant against this table, row by row.
const FALL_2025 = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac';
const WINTER_1_2026 = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106';
const TABLE = [
  {
    team: 'Bag Assassins',
    season: 'Fall 2025',
    key: `21f5f389-1ad4-4dc5-a828-0e2972c13845_${FALL_2025}`,
    real: 'Intermediate',
    tier: 'intermediate',
    games: 1,
  },
  {
    team: 'Shut Your Cornhole',
    season: 'Fall 2025',
    key: `5db6b718-81af-4bd0-a0cd-0a0eae4330ad_${FALL_2025}`,
    real: 'Competitive',
    tier: 'competitive',
    games: 4,
  },
  {
    team: 'Jerm',
    season: 'Winter 1 2026',
    key: `aa967a4d-b9a8-496e-81e9-7993ac005763_${WINTER_1_2026}`,
    real: 'Recreational',
    tier: 'recreational',
    games: 2,
  },
  {
    team: 'Red Roof Rockets',
    season: 'Winter 1 2026',
    key: `e91cb2d1-ef48-48e7-b15f-735c941f3679_${WINTER_1_2026}`,
    real: 'Recreational',
    tier: 'recreational',
    games: 1,
  },
  {
    team: 'The Tomato Saucers',
    season: 'Winter 2 2026',
    key: 'accd6e20-f761-4769-8cdc-6c9495cc231c_9cd55eb8-672c-4a43-a9df-3552a7759cca',
    real: 'Recreational',
    tier: 'recreational',
    games: 2,
  },
  {
    team: "Baggin' & Braggin'",
    season: 'Spring 2026',
    key: 'fcb5fb21-a8f4-4dbd-a04d-7688832ada8c_660382ee-e13b-4866-81fc-7e51c4df5d11',
    real: 'Competitive',
    tier: 'competitive',
    games: 4,
  },
  {
    team: 'Burning Holes & Taking Souls',
    season: 'Summer 1 2026',
    key: 'eb7976c7-fc7f-40e9-926d-d8bd1754003d_7df71033-ed43-40f7-bad6-8c411cf3a241',
    real: 'Recreational',
    tier: 'recreational',
    games: 6,
  },
  {
    team: 'Zoo Pals',
    season: 'Fall 2026 (active)',
    key: '56387477-8ba1-43b7-a307-414926ca5f79_02572002-9c31-467c-99db-bd3bbf2cdf7c',
    real: 'Intermediate',
    tier: 'intermediate',
    games: 2,
  },
] as const;

const gamesPerTier = (division: (key: string) => string | undefined) => {
  const counts: Record<DivisionTier, number> = { competitive: 0, intermediate: 0, recreational: 0 };
  for (const row of TABLE) {
    const tier = categorizeDivision(division(row.key) ?? null);
    if (tier) counts[tier] += row.games;
  }
  return counts;
};

describe('DROPOUT_DIVISIONS', () => {
  it("holds exactly Doug's 8 team-seasons", () => {
    expect(Object.keys(DROPOUT_DIVISIONS).sort()).toEqual(TABLE.map((row) => row.key).sort());
  });

  it('writes every key as "<team uuid>_<season uuid>"', () => {
    for (const key of Object.keys(DROPOUT_DIVISIONS)) {
      expect(key).toMatch(KEY_FORMAT);
    }
  });

  it('gives every value a name that files into a division tier', () => {
    for (const [key, name] of Object.entries(DROPOUT_DIVISIONS)) {
      expect(categorizeDivision(name), key).not.toBeNull();
    }
  });

  it.each(TABLE)('files $team ($season) under $real', ({ key, real, tier }) => {
    expect(DROPOUT_DIVISIONS[key]).toBe(real);
    expect(categorizeDivision(DROPOUT_DIVISIONS[key])).toBe(tier);
  });

  it('files the 22 games as 8 Competitive, 3 Intermediate and 11 Recreational', () => {
    expect(TABLE.reduce((sum, row) => sum + row.games, 0)).toBe(22);
    expect(gamesPerTier((key) => DROPOUT_DIVISIONS[key])).toEqual({
      competitive: 8,
      intermediate: 3,
      recreational: 11,
    });
  });

  it('turns 8 Hidden team-seasons into the right tiers on a stored division map', () => {
    const stored = new Map<string, string>(TABLE.map((row) => [row.key, 'Hidden']));
    // Today Career drops all 22 games, because every stored name says Hidden.
    expect(gamesPerTier((key) => stored.get(key))).toEqual({
      competitive: 0,
      intermediate: 0,
      recreational: 0,
    });

    const filed = applyRealDivisions(stored, applyDropoutDivisions(new Map()));
    expect(gamesPerTier((key) => filed.get(key))).toEqual({
      competitive: 8,
      intermediate: 3,
      recreational: 11,
    });
  });
});

describe('applyDropoutDivisions', () => {
  it('adds the whole list to an empty lookup', () => {
    const merged = applyDropoutDivisions(new Map());
    expect(merged.size).toBe(8);
    expect(merged.get(TABLE[7].key)).toBe('Intermediate');
  });

  it('keeps the lookup answers the list has no row for', () => {
    const merged = applyDropoutDivisions(new Map([['new-team_new-season', 'Competitive']]));
    expect(merged.get('new-team_new-season')).toBe('Competitive');
    expect(merged.size).toBe(9);
  });

  it('lets a row in the list win over the lookup for the same team and season', () => {
    const merged = applyDropoutDivisions(new Map([[TABLE[1].key, 'Recreational']]));
    expect(merged.get(TABLE[1].key)).toBe('Competitive');
  });

  it('uses the list it is given, so an empty list leaves the lookup as it was', () => {
    const lookup = new Map([['a_b', 'Intermediate']]);
    const merged = applyDropoutDivisions(lookup, {});
    expect([...merged]).toEqual([['a_b', 'Intermediate']]);
  });

  it('skips a Hidden or blank name in the list so it never wipes out a good answer', () => {
    const merged = applyDropoutDivisions(
      new Map([
        ['a_b', 'Intermediate'],
        ['c_d', 'Competitive'],
      ]),
      { a_b: 'Hidden', c_d: '  ', e_f: 'Hidden2' }
    );
    expect(Object.fromEntries(merged)).toEqual({ a_b: 'Intermediate', c_d: 'Competitive' });
  });

  it('does not change the lookup it was given', () => {
    const lookup = new Map([[TABLE[0].key, 'Recreational']]);
    applyDropoutDivisions(lookup);
    expect(lookup.get(TABLE[0].key)).toBe('Recreational');
    expect(lookup.size).toBe(1);
  });
});
