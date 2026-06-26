import { describe, expect, it } from 'vitest';

import { computeDivisionMatchups } from '../useLeagueDivisionMatchups';

const tsd = (team_id: string, season_id: string, division_name: string) => ({
  team_id,
  season_id,
  division_name,
});

describe('computeDivisionMatchups', () => {
  it('returns six pairings with zeroed counts when no matches', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      playoffMatches: [],
      teamSeasonDivisions: [],
      brackets: [],
    });
    expect(result).toHaveLength(6);
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('counts same-tier matchups symmetrically', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 't1', loser_id: 't2', season_id: 's1' },
        { winner_id: 't2', loser_id: 't1', season_id: 's1' },
      ],
      archivedMatches: [],
      playoffMatches: [],
      teamSeasonDivisions: [
        tsd('t1', 's1', 'Competitive'),
        tsd('t2', 's1', 'Competitive'),
      ],
      brackets: [],
    });
    const cc = result.find((r) => r.tierA === 'competitive' && r.tierB === 'competitive');
    expect(cc).toEqual({ tierA: 'competitive', tierB: 'competitive', winsA: 1, winsB: 1 });
  });

  it('orients cross-tier matchups so the higher tier is side A', () => {
    const result = computeDivisionMatchups({
      matches: [
        { winner_id: 'c1', loser_id: 'i1', season_id: 's1' }, // comp wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
        { winner_id: 'i1', loser_id: 'c1', season_id: 's1' }, // int wins
      ],
      archivedMatches: [],
      playoffMatches: [],
      teamSeasonDivisions: [
        tsd('c1', 's1', 'Competitive'),
        tsd('i1', 's1', 'Intermediate'),
      ],
      brackets: [],
    });
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 2 });
  });

  it('uses historical division for each season independently', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's2' }],
      archivedMatches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      playoffMatches: [],
      teamSeasonDivisions: [
        tsd('t1', 's1', 'Recreational'),
        tsd('t2', 's1', 'Recreational'),
        tsd('t1', 's2', 'Competitive'),
        tsd('t2', 's2', 'Intermediate'),
      ],
      brackets: [],
    });
    const rr = result.find((r) => r.tierA === 'recreational' && r.tierB === 'recreational');
    const ci = result.find((r) => r.tierA === 'competitive' && r.tierB === 'intermediate');
    expect(rr?.winsA).toBe(1);
    expect(rr?.winsB).toBe(1);
    expect(ci).toEqual({ tierA: 'competitive', tierB: 'intermediate', winsA: 1, winsB: 0 });
  });

  it('skips matches where a team has no historical division', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 'missing', season_id: 's1' }],
      archivedMatches: [],
      playoffMatches: [],
      teamSeasonDivisions: [tsd('t1', 's1', 'Competitive')],
      brackets: [],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('skips hidden divisions', () => {
    const result = computeDivisionMatchups({
      matches: [{ winner_id: 't1', loser_id: 't2', season_id: 's1' }],
      archivedMatches: [],
      playoffMatches: [],
      teamSeasonDivisions: [
        tsd('t1', 's1', 'Hidden'),
        tsd('t2', 's1', 'Competitive'),
      ],
      brackets: [],
    });
    expect(result.every((r) => r.winsA === 0 && r.winsB === 0)).toBe(true);
  });

  it('classifies playoff matches by bracket display division', () => {
    const result = computeDivisionMatchups({
      matches: [],
      archivedMatches: [],
      playoffMatches: [
        { winner_id: 'x', loser_id: 'y', bracket_id: 'b1' },
        { winner_id: 'y', loser_id: 'x', bracket_id: 'b1' },
      ],
      teamSeasonDivisions: [],
      brackets: [{ id: 'b1', display_division: 'Recreational' }],
    });
    const rr = result.find((r) => r.tierA === 'recreational' && r.tierB === 'recreational');
    expect(rr).toEqual({ tierA: 'recreational', tierB: 'recreational', winsA: 1, winsB: 1 });
  });
});