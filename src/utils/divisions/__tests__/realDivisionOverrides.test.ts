import { describe, expect, it } from 'vitest';

import { categorizeDivision } from '@/utils/career/calculateDivisionRecords';
import type { DivisionTier } from '@/utils/career/types';

import {
  applyRealDivisions,
  isHiddenDivisionName,
  pickRealDivisions,
  type RealDivisionRow,
} from '../realDivisionOverrides';

// The 8 team-seasons that dropped out and were moved to Hidden: 22 real games.
// "lookup" says whether the Power Score view can name the division (15 games).
// The other 7 games come only from Doug's list (2026-11-16).
const DROPOUTS = [
  { team: 'bag-assassins', season: 'fall-2025', games: 1, real: 'Intermediate', lookup: true },
  { team: 'shut-your-cornhole', season: 'fall-2025', games: 4, real: 'Competitive', lookup: false },
  { team: 'jerm', season: 'winter-1-2026', games: 2, real: 'Recreational', lookup: true },
  {
    team: 'red-roof-rockets',
    season: 'winter-1-2026',
    games: 1,
    real: 'Recreational',
    lookup: false,
  },
  {
    team: 'tomato-saucers',
    season: 'winter-2-2026',
    games: 2,
    real: 'Recreational',
    lookup: false,
  },
  {
    team: 'baggin-and-braggin',
    season: 'spring-2026',
    games: 4,
    real: 'Competitive',
    lookup: true,
  },
  { team: 'burning-holes', season: 'summer-1-2026', games: 6, real: 'Recreational', lookup: true },
  { team: 'zoo-pals', season: 'fall-2026', games: 2, real: 'Intermediate', lookup: true },
] as const;

const DIVISION_IDS: Record<string, string> = {
  Competitive: 'div-competitive',
  Intermediate: 'div-intermediate',
  Recreational: 'div-recreational',
};

const DIVISION_NAMES = new Map<string, string>([
  ['div-competitive', 'Competitive'],
  ['div-intermediate', 'Intermediate'],
  ['div-recreational', 'Recreational'],
  ['div-hidden', 'Hidden'],
]);

const key = (team: string, season: string) => `${team}_${season}`;

const row = (overrides: Partial<RealDivisionRow> = {}): RealDivisionRow => ({
  opponent_id: 'opp',
  season_id: 'season',
  opp_division_id: 'div-competitive',
  resolved_by: 'snapshot_at_date',
  match_date: '2026-05-01T18:00:00+00:00',
  ...overrides,
});

/** One view row per game played against a dropped-out team. */
const viewRowsForDropouts = (): RealDivisionRow[] =>
  DROPOUTS.flatMap((d) =>
    Array.from({ length: d.games }, (_, i) =>
      row({
        opponent_id: d.team,
        season_id: d.season,
        opp_division_id: d.lookup ? DIVISION_IDS[d.real] : null,
        resolved_by: d.lookup ? 'snapshot_at_date' : 'unresolved',
        match_date: `2026-03-0${i + 1}T18:00:00+00:00`,
      })
    )
  );

const tierCounts = (
  divisions: ReadonlyMap<string, string | null>,
  tierOf: (name: string | null) => DivisionTier | null
): Record<DivisionTier, number> => {
  const counts: Record<DivisionTier, number> = { competitive: 0, intermediate: 0, recreational: 0 };
  for (const d of DROPOUTS) {
    const tier = tierOf(divisions.get(key(d.team, d.season)) ?? null);
    if (tier) counts[tier] += d.games;
  }
  return counts;
};

describe('isHiddenDivisionName', () => {
  it.each(['Hidden', 'Hidden2', 'hidden', 'HIDDEN 2'])('says %s is Hidden', (name) => {
    expect(isHiddenDivisionName(name)).toBe(true);
  });

  it.each(['Competitive', 'Intermediate Low', 'Recreational', 'Cuspers', ''])(
    'says %s is not Hidden',
    (name) => {
      expect(isHiddenDivisionName(name)).toBe(false);
    }
  );

  it('says a missing name is not Hidden', () => {
    expect(isHiddenDivisionName(null)).toBe(false);
    expect(isHiddenDivisionName(undefined)).toBe(false);
  });
});

describe('pickRealDivisions', () => {
  it('returns nothing when the view has no rows', () => {
    expect(pickRealDivisions([], DIVISION_NAMES).size).toBe(0);
  });

  it('names the 5 team-seasons the Power Score can answer and leaves the 3 it cannot', () => {
    const picked = pickRealDivisions(viewRowsForDropouts(), DIVISION_NAMES);

    expect(Object.fromEntries(picked)).toEqual({
      [key('bag-assassins', 'fall-2025')]: 'Intermediate',
      [key('jerm', 'winter-1-2026')]: 'Recreational',
      [key('baggin-and-braggin', 'spring-2026')]: 'Competitive',
      [key('burning-holes', 'summer-1-2026')]: 'Recreational',
      [key('zoo-pals', 'fall-2026')]: 'Intermediate',
    });
  });

  it('never answers with a row that has no division id', () => {
    const picked = pickRealDivisions([row({ opp_division_id: null })], DIVISION_NAMES);
    expect(picked.size).toBe(0);
  });

  it('never answers with an unresolved row, even when it carries a division id', () => {
    const picked = pickRealDivisions([row({ resolved_by: 'unresolved' })], DIVISION_NAMES);
    expect(picked.size).toBe(0);
  });

  it('never answers with a division whose name is not known', () => {
    const picked = pickRealDivisions([row({ opp_division_id: 'div-gone' })], DIVISION_NAMES);
    expect(picked.size).toBe(0);
  });

  it('never answers with a Hidden division', () => {
    const picked = pickRealDivisions([row({ opp_division_id: 'div-hidden' })], DIVISION_NAMES);
    expect(picked.size).toBe(0);
  });

  it('skips a row with no opponent or no season', () => {
    const picked = pickRealDivisions(
      [row({ opponent_id: null }), row({ season_id: null })],
      DIVISION_NAMES
    );
    expect(picked.size).toBe(0);
  });

  it('keeps one name per opponent and season: the most frequent answer wins', () => {
    const picked = pickRealDivisions(
      [
        row({ opp_division_id: 'div-competitive', match_date: '2026-03-01T18:00:00+00:00' }),
        row({ opp_division_id: 'div-recreational', match_date: '2026-03-08T18:00:00+00:00' }),
        row({ opp_division_id: 'div-recreational', match_date: '2026-03-15T18:00:00+00:00' }),
      ],
      DIVISION_NAMES
    );
    expect(picked.get(key('opp', 'season'))).toBe('Recreational');
  });

  it('breaks a tie with the earlier match, whatever order the rows arrive in', () => {
    const later = row({ opp_division_id: 'div-recreational', match_date: '2026-04-10T18:00:00Z' });
    const earlier = row({ opp_division_id: 'div-competitive', match_date: '2026-03-10T18:00:00Z' });

    expect(pickRealDivisions([later, earlier], DIVISION_NAMES).get(key('opp', 'season'))).toBe(
      'Competitive'
    );
    expect(pickRealDivisions([earlier, later], DIVISION_NAMES).get(key('opp', 'season'))).toBe(
      'Competitive'
    );
  });

  it('compares dates as moments, not as text', () => {
    // 11:00 at -05:00 is 16:00 UTC, which is before 17:00 UTC even though the text sorts after.
    const picked = pickRealDivisions(
      [
        row({ opp_division_id: 'div-recreational', match_date: '2026-03-10T17:00:00+00:00' }),
        row({ opp_division_id: 'div-competitive', match_date: '2026-03-10T11:00:00-05:00' }),
      ],
      DIVISION_NAMES
    );
    expect(picked.get(key('opp', 'season'))).toBe('Competitive');
  });

  it('lets a dated match beat an undated one in a tie', () => {
    const picked = pickRealDivisions(
      [
        row({ opp_division_id: 'div-recreational', match_date: null }),
        row({ opp_division_id: 'div-competitive', match_date: '2026-03-10T18:00:00Z' }),
      ],
      DIVISION_NAMES
    );
    expect(picked.get(key('opp', 'season'))).toBe('Competitive');
  });

  it('keeps the first row when a tie has no usable dates at all', () => {
    const picked = pickRealDivisions(
      [
        row({ opp_division_id: 'div-intermediate', match_date: null }),
        row({ opp_division_id: 'div-recreational', match_date: 'not a date' }),
      ],
      DIVISION_NAMES
    );
    expect(picked.get(key('opp', 'season'))).toBe('Intermediate');
  });

  it('keeps two seasons of one opponent apart', () => {
    const picked = pickRealDivisions(
      [
        row({ season_id: 's1', opp_division_id: 'div-competitive' }),
        row({ season_id: 's2', opp_division_id: 'div-recreational' }),
      ],
      DIVISION_NAMES
    );
    expect(picked.get(key('opp', 's1'))).toBe('Competitive');
    expect(picked.get(key('opp', 's2'))).toBe('Recreational');
  });
});

describe('applyRealDivisions', () => {
  it('fills an entry that is missing', () => {
    const result = applyRealDivisions(
      new Map<string, string>(),
      new Map([[key('zoo-pals', 'fall-2026'), 'Intermediate']])
    );
    expect(result.get(key('zoo-pals', 'fall-2026'))).toBe('Intermediate');
  });

  it('replaces a Hidden entry', () => {
    const result = applyRealDivisions(
      new Map([['t_s', 'Hidden']]),
      new Map([['t_s', 'Recreational']])
    );
    expect(result.get('t_s')).toBe('Recreational');
  });

  it('replaces a Hidden2 entry and a blank entry', () => {
    const result = applyRealDivisions(
      new Map<string, string | null>([
        ['a_s', 'Hidden2'],
        ['b_s', ''],
        ['c_s', null],
      ]),
      new Map([
        ['a_s', 'Competitive'],
        ['b_s', 'Intermediate'],
        ['c_s', 'Recreational'],
      ])
    );
    expect(Object.fromEntries(result)).toEqual({
      a_s: 'Competitive',
      b_s: 'Intermediate',
      c_s: 'Recreational',
    });
  });

  it('never overrides a real stored name', () => {
    const result = applyRealDivisions(
      new Map([['t_s', 'Competitive']]),
      new Map([['t_s', 'Recreational']])
    );
    expect(result.get('t_s')).toBe('Competitive');
  });

  it('never applies a Hidden or blank answer', () => {
    const result = applyRealDivisions(
      new Map([
        ['a_s', 'Hidden'],
        ['b_s', 'Hidden'],
      ]),
      new Map([
        ['a_s', 'Hidden2'],
        ['b_s', '  '],
      ])
    );
    expect(result.get('a_s')).toBe('Hidden');
    expect(result.get('b_s')).toBe('Hidden');
  });

  it('leaves the entries it has no answer for exactly as they were', () => {
    const result = applyRealDivisions(
      new Map([
        ['a_s', 'Competitive'],
        ['b_s', 'Hidden'],
      ]),
      new Map([['other_s', 'Recreational']])
    );
    expect(result.get('a_s')).toBe('Competitive');
    expect(result.get('b_s')).toBe('Hidden');
    expect(result.has('other_s')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('gives back the same entries when there are no answers', () => {
    const original = new Map([
      ['a_s', 'Competitive'],
      ['b_s', 'Hidden'],
    ]);
    const result = applyRealDivisions(original, new Map());
    expect([...result]).toEqual([...original]);
  });

  it('does not change the map it was given', () => {
    const original = new Map([['t_s', 'Hidden']]);
    applyRealDivisions(original, new Map([['t_s', 'Recreational']]));
    expect(original.get('t_s')).toBe('Hidden');
  });

  it('files all 22 games against dropped-out teams under their real division', () => {
    // Today every one of the 8 team-seasons says Hidden.
    const stored = new Map<string, string>(DROPOUTS.map((d) => [key(d.team, d.season), 'Hidden']));
    // Answers: the Power Score lookup, plus Doug's list for the 3 it cannot answer.
    const answers = pickRealDivisions(viewRowsForDropouts(), DIVISION_NAMES);
    for (const d of DROPOUTS.filter((x) => !x.lookup)) answers.set(key(d.team, d.season), d.real);

    // Career drops a Hidden game; with answers all 22 are filed.
    expect(tierCounts(stored, categorizeDivision)).toEqual({
      competitive: 0,
      intermediate: 0,
      recreational: 0,
    });
    expect(tierCounts(applyRealDivisions(stored, answers), categorizeDivision)).toEqual({
      competitive: 8,
      intermediate: 3,
      recreational: 11,
    });
  });
});
