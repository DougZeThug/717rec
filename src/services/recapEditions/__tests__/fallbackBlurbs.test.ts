import { describe, expect, it } from 'vitest';

import type { RecapTeamGrade } from '@/types/recapEdition';

import { buildFallbackBlurbs } from '../fallbackBlurbs';

const team = (overrides: Partial<RecapTeamGrade> = {}): RecapTeamGrade => ({
  rank: 1,
  previousRank: 1,
  teamId: 't-1',
  teamName: 'Bag Chasers',
  logoUrl: null,
  division: 'Competitive',
  grade: 'A',
  gpa: 3.8,
  categories: [],
  wins: 6,
  losses: 2,
  powerScore: 72.4,
  delta: 2.1,
  ...overrides,
});

describe('buildFallbackBlurbs', () => {
  it('names the climb, the record and the power move', () => {
    const blurbs = buildFallbackBlurbs([team({ rank: 4, previousRank: 7, delta: 4.2 })]);

    expect(blurbs['t-1']).toBe('Up 3 to 4th, 6-2 on the season, +4.2 power.');
  });

  it('names a fall the same way', () => {
    const blurbs = buildFallbackBlurbs([
      team({ rank: 9, previousRank: 7, wins: 3, losses: 5, delta: -2.1 }),
    ]);

    expect(blurbs['t-1']).toBe('Down 2 to 9th, 3-5 on the season, -2.1 power.');
  });

  it('says a team held its place rather than inventing a move', () => {
    const blurbs = buildFallbackBlurbs([team({ rank: 5, previousRank: 5, delta: 0 })]);

    expect(blurbs['t-1']).toBe('Holds 5th, 6-2 on the season.');
  });

  it('does not claim a move when there is no previous week', () => {
    const blurbs = buildFallbackBlurbs([team({ rank: 5, previousRank: null, delta: null })]);

    expect(blurbs['t-1']).toBe('Sits 5th, 6-2 on the season.');
    expect(blurbs['t-1']).not.toMatch(/up|down|climb|fall/i);
  });

  it('leaves out a power move inside the rounding band, not "+0.0"', () => {
    const blurbs = buildFallbackBlurbs([team({ delta: 0.02 })]);

    expect(blurbs['t-1']).not.toContain('0.0');
  });

  it('leaves out the record for a team that has not played', () => {
    const blurbs = buildFallbackBlurbs([
      team({ rank: 20, previousRank: null, wins: 0, losses: 0, delta: null }),
    ]);

    expect(blurbs['t-1']).toBe('Sits 20th.');
  });

  it('awards the biggest climb and steepest fall to one team each', () => {
    const blurbs = buildFallbackBlurbs([
      team({ teamId: 'climber', rank: 1, previousRank: 6 }),
      team({ teamId: 'small-climb', rank: 2, previousRank: 4 }),
      team({ teamId: 'faller', rank: 8, previousRank: 3 }),
      team({ teamId: 'steady', rank: 4, previousRank: 4 }),
    ]);

    expect(blurbs.climber).toContain("The week's biggest climb.");
    expect(blurbs.faller).toContain("The week's steepest fall.");
    expect(blurbs['small-climb']).not.toContain('biggest');
    expect(blurbs.steady).not.toMatch(/biggest|steepest/);
  });

  it('awards no superlative when two teams tie for it', () => {
    const blurbs = buildFallbackBlurbs([
      team({ teamId: 'a', rank: 1, previousRank: 4 }),
      team({ teamId: 'b', rank: 2, previousRank: 5 }),
    ]);

    // "The biggest climb" would be a lie told to two teams at once.
    expect(Object.values(blurbs).every((b) => !b.includes('biggest'))).toBe(true);
  });

  it('ignores a one-place shuffle as a superlative', () => {
    const blurbs = buildFallbackBlurbs([
      team({ teamId: 'a', rank: 1, previousRank: 2 }),
      team({ teamId: 'b', rank: 2, previousRank: 1 }),
    ]);

    expect(Object.values(blurbs).every((b) => !/biggest|steepest/.test(b))).toBe(true);
  });

  it('describes nothing the league does not record', () => {
    const blurbs = buildFallbackBlurbs([
      team({ rank: 3, previousRank: 8, delta: 6 }),
      team({ teamId: 't-2', rank: 12, previousRank: 4, delta: -6 }),
    ]);

    for (const line of Object.values(blurbs)) {
      expect(line).not.toMatch(/throw|bag|comeback|clutch|rally|shot/i);
    }
  });

  it('awards no superlative when there is nothing to compare against', () => {
    // "The week's biggest climb", said of the only team that moved anywhere,
    // is a restatement dressed up as a comparison.
    const blurbs = buildFallbackBlurbs([team({ rank: 1, previousRank: 6 })]);

    expect(blurbs['t-1']).toBe('Up 5 to 1st, 6-2 on the season, +2.1 power.');
  });

  it('writes a line for every team', () => {
    const teams = Array.from({ length: 26 }, (_, i) =>
      team({ teamId: `t-${i}`, rank: i + 1, previousRank: i + 1 })
    );

    expect(Object.keys(buildFallbackBlurbs(teams))).toHaveLength(26);
  });
});
