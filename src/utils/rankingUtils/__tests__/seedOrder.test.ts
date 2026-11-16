import { describe, expect, it } from 'vitest';

import { compareSeedOrder, type SeedOrderTeam } from '../seedOrder';

const team = (name: string, overrides: Partial<SeedOrderTeam> = {}): SeedOrderTeam => ({
  name,
  powerScore: 50,
  divisionName: 'Intermediate',
  winPercentage: 0.5,
  ...overrides,
});

/** The team names in seed order, best first. */
const orderOf = (...teams: SeedOrderTeam[]) =>
  [...teams].sort(compareSeedOrder).map((entry) => entry.name);

// The rule is the one createBracket uses for teams nobody gave a seed:
// displayed score, then division tier, then win %, then name.
describe('compareSeedOrder', () => {
  it('puts the higher power score first', () => {
    expect(
      orderOf(
        team('A', { powerScore: 50 }),
        team('B', { powerScore: 90 }),
        team('C', { powerScore: 70 })
      )
    ).toEqual(['B', 'C', 'A']);
  });

  it('sinks a team with no power score to the end, whether null or undefined', () => {
    expect(
      orderOf(
        team('Empty', { powerScore: null }),
        team('Low', { powerScore: 10 }),
        team('Missing', { powerScore: undefined }),
        team('High', { powerScore: 80 })
      )
    ).toEqual(['High', 'Low', 'Empty', 'Missing']);
  });

  it('orders two teams with no power score by tier, then win %, then name', () => {
    expect(
      orderOf(
        team('Rec', { powerScore: null, divisionName: 'Recreational', winPercentage: 0.9 }),
        team('Comp', { powerScore: null, divisionName: 'Competitive', winPercentage: 0.1 })
      )
    ).toEqual(['Comp', 'Rec']);
    expect(
      orderOf(
        team('Low', { powerScore: null, winPercentage: 0.2 }),
        team('High', { powerScore: null, winPercentage: 0.8 })
      )
    ).toEqual(['High', 'Low']);
    expect(
      orderOf(team('Zeta', { powerScore: null }), team('Alpha', { powerScore: null }))
    ).toEqual(['Alpha', 'Zeta']);
  });

  it('breaks equal power scores by win percentage, higher first', () => {
    expect(orderOf(team('B', { winPercentage: 0.5 }), team('A', { winPercentage: 0.8 }))).toEqual([
      'A',
      'B',
    ]);
  });

  // Today's saved-bracket rule. A better division beats a better win % when the
  // two scores print the same.
  it('puts the better division first on a displayed tie, even with the lower win %', () => {
    expect(
      orderOf(
        team('Rec Stars', { powerScore: 55, divisionName: 'Recreational', winPercentage: 0.9 }),
        team('Comp Crew', { powerScore: 55, divisionName: 'Competitive', winPercentage: 0.4 })
      )
    ).toEqual(['Comp Crew', 'Rec Stars']);
  });

  it('reads the tier from the division name, so Competitive Low is still Competitive', () => {
    expect(
      orderOf(
        team('Inter', { divisionName: 'Intermediate High', winPercentage: 0.9 }),
        team('CompLow', { divisionName: 'Competitive Low', winPercentage: 0.1 }),
        team('Rec', { divisionName: 'Recreational High', winPercentage: 0.9 })
      )
    ).toEqual(['CompLow', 'Inter', 'Rec']);
  });

  // 41.65 is stored just under the .x5 boundary, so it prints "41.6", the same as
  // 41.6. They are tied and the win % decides. Math.round(x * 10) / 10 would read
  // 41.7 and put the 0.4 team first.
  it('treats 41.65 and 41.6 as the same displayed score and lets win % decide', () => {
    expect(
      orderOf(
        team('High Raw', { powerScore: 41.65, winPercentage: 0.4 }),
        team('Low Raw', { powerScore: 41.6, winPercentage: 0.7 })
      )
    ).toEqual(['Low Raw', 'High Raw']);
  });

  it('still separates two scores that print differently', () => {
    expect(
      orderOf(
        team('Lower', { powerScore: 41.6, winPercentage: 0.9 }),
        team('Higher', { powerScore: 41.7, winPercentage: 0.1 })
      )
    ).toEqual(['Higher', 'Lower']);
  });

  // A real score of 0 is a score. Reading 0 as "no score" sank the team below
  // every team that had one, including a team scoring below zero.
  it('keeps a real power score of 0 above a missing score and above a negative one', () => {
    expect(
      orderOf(
        team('Missing', { powerScore: null }),
        team('Minus', { powerScore: -5 }),
        team('Zero', { powerScore: 0 })
      )
    ).toEqual(['Zero', 'Minus', 'Missing']);
  });

  it('breaks a full tie by team name, A to Z', () => {
    expect(orderOf(team('Zeta'), team('Alpha'), team('Mu'))).toEqual(['Alpha', 'Mu', 'Zeta']);
  });

  it('treats a missing division as Intermediate and a missing win % as 0', () => {
    expect(
      orderOf(
        team('Rec', { divisionName: 'Recreational' }),
        team('None', { divisionName: null }),
        team('Comp', { divisionName: 'Competitive' }),
        team('Unset', { divisionName: undefined })
      )
    ).toEqual(['Comp', 'None', 'Unset', 'Rec']);
    expect(
      orderOf(
        team('Zero', { winPercentage: null }),
        team('Unset', { winPercentage: undefined }),
        team('Some', { winPercentage: 0.1 })
      )
    ).toEqual(['Some', 'Unset', 'Zero']);
  });

  it('returns 0 for a team compared with itself', () => {
    const only = team('Only');
    expect(compareSeedOrder(only, only)).toBe(0);
  });
});
