import { describe, expect, it } from 'vitest';

import type { RecapTeamGrade } from '@/types/recapEdition';

import {
  paginateRankings,
  RANKING_CONTENT_BUDGET,
  RANKING_ROW_HEIGHT,
  RANKING_ROWS_PER_PAGE,
} from '../powerRankingPages';

const teams = (count: number): RecapTeamGrade[] =>
  Array.from({ length: count }, (_, i) => ({
    rank: i + 1,
    previousRank: null,
    teamId: `t-${i + 1}`,
    teamName: `Team ${i + 1}`,
    logoUrl: null,
    division: 'Competitive',
    grade: 'B' as const,
    gpa: 3,
    categories: [],
    wins: 4,
    losses: 2,
    powerScore: 60,
    delta: null,
  }));

describe('paginateRankings', () => {
  it('fits the real league onto three images', () => {
    const pages = paginateRankings(teams(26));

    expect(pages.map((p) => p.teams.length)).toEqual([9, 9, 8]);
    expect(pages.map((p) => p.label)).toEqual(['1–9', '10–18', '19–26']);
    expect(pages.every((p) => p.pageCount === 3)).toBe(true);
  });

  it('spreads teams evenly rather than leaving a stub last page', () => {
    // Filling each page to the cap would give 9 / 9 / 9 / 1, and that last
    // image is not worth posting.
    const pages = paginateRankings(teams(28));

    expect(pages.map((p) => p.teams.length)).toEqual([7, 7, 7, 7]);
  });

  it('never puts more than the cap on a page', () => {
    for (let n = 1; n <= 60; n += 1) {
      const pages = paginateRankings(teams(n));
      expect(pages.every((p) => p.teams.length <= RANKING_ROWS_PER_PAGE)).toBe(true);
      // Every team appears exactly once, in order.
      expect(pages.flatMap((p) => p.teams.map((t) => t.rank))).toEqual(
        Array.from({ length: n }, (_, i) => i + 1)
      );
    }
  });

  // jsdom does no layout, so no rendering test can catch a tenth row pushing
  // the last team off the bottom of the exported PNG. This holds the row count
  // to the space the frame actually has.
  it('fits its rows inside the frame', () => {
    expect(RANKING_ROWS_PER_PAGE * RANKING_ROW_HEIGHT).toBeLessThanOrEqual(RANKING_CONTENT_BUDGET);
    // And it is not wastefully short either — one more row would not fit.
    expect((RANKING_ROWS_PER_PAGE + 1) * RANKING_ROW_HEIGHT).toBeGreaterThan(
      RANKING_CONTENT_BUDGET
    );
  });

  it('returns nothing for an empty league', () => {
    expect(paginateRankings([])).toEqual([]);
  });
});
