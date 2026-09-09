import { describe, expect, it } from 'vitest';

import { computeDivisionMatchups } from '../useLeagueDivisionMatchups';

const tsd = (team_id: string, season_id: string, division_name: string) => ({
  team_id,
  season_id,
  division_name,
});

describe('computeDivisionMatchups', () => {
  it('returns one pairing per pair of different divisions, zeroed, when no matches', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      teamSeasonDivisions: [],
    });
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  // IN-01: the card used to carry three self-pairing rows, which are symmetric by
  // construction and could only ever read "433–433".
  it('never returns a division paired with itself', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      teamSeasonDivisions: [],
    });
    expect(result.every((r) => r.tierA !== r.tierB)).toBe(true);
  });

  it('ignores matches played inside one division', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 't1', loser_id: 't2', season_id: 's1' },
        { winner_id: 't2', loser_id: 't1', season_id: 's1' },
      ],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Competitive'), tsd('t2', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('orients cross-tier matchups so the higher tier is side A', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 'c1', loser_id: 'i1', season_id: 's1' }, // comp wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
      ],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('c1', 's1', 'Competitive'), tsd('i1', 's1', 'Intermediate')],
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 2 });
  });

  it('uses historical division for each season independently', () => {
    const result = computeDivisionMatchups({
      // Same two teams: one division apiece in s2, both recreational in s1.
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's2' }],
      archivedMatches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      teamSeasonDivisions: [
        tsd('t1', 's1', 'Recreational'),
        tsd('t2', 's1', 'Recreational'),
        tsd('t1', 's2', 'Competitive'),
        tsd('t2', 's2', 'Intermediate'),
      ],
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    // Only the cross-division season counts; the same-division one is dropped.
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 0 });
    expect(result.reduce((sum, r) => sum + r.winsA + r.winsB, 0)).toBe(1);
  });

  it('skips matches where a team has no historical division', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 'missing', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('skips hidden divisions', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      archivedMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Hidden'), tsd('t2', 's1', 'Competitive')],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });
});
