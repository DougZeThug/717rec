import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';
import type { TeamTimeslot } from '@/types/timeslots';

import {
  buildDivisionOptions,
  filterGroupedTimeslots,
  matchInvolvesTeam,
  matchIsInDivision,
  timeslotInvolvesTeam,
  timeslotIsInDivision,
} from '../matchFilters';

const divisions = [
  {
    id: 'div-comp-hi',
    name: 'Competitive High',
    display_division: 'Competitive',
    division_weight: 3,
  },
  {
    id: 'div-comp-lo',
    name: 'Competitive Low',
    display_division: 'Competitive',
    division_weight: 3,
  },
  { id: 'div-int', name: 'Intermediate', display_division: 'Intermediate', division_weight: 2 },
];

const options = buildDivisionOptions(divisions);
const competitive = options[0];
const intermediate = options[1];

const side = (teamId: string, divisionId: string | null) => ({
  team_id: teamId,
  name: teamId,
  image_url: null,
  logo_url: null,
  divisionName: null,
  division_id: divisionId,
  power_score: null,
  sos: null,
});

const match = (team1Division: string | null, team2Division: string | null): Match =>
  ({
    id: 'm1',
    team1Id: 't1',
    team2Id: 't2',
    team1Details: side('t1', team1Division),
    team2Details: side('t2', team2Division),
  }) as Match;

const timeslotRow = (teamId: string, divisionName: string | null): TeamTimeslot =>
  ({
    id: `ts-${teamId}`,
    team_id: teamId,
    teams: { id: teamId, name: teamId, divisionName },
  }) as TeamTimeslot;

describe('buildDivisionOptions', () => {
  it('puts every real division under its display name', () => {
    expect(options).toHaveLength(2);
    expect(competitive.label).toBe('Competitive');
    expect([...competitive.ids].sort()).toEqual(['div-comp-hi', 'div-comp-lo']);
  });

  it('keeps the order the divisions list came in, strongest first', () => {
    expect(options.map((o) => o.label)).toEqual(['Competitive', 'Intermediate']);
  });

  it('gives each chip its address value', () => {
    expect(competitive.value).toBe('competitive');
  });

  it('collects the real names too, for rows that carry no division id', () => {
    expect([...competitive.names].sort()).toEqual(['competitive high', 'competitive low']);
  });

  it('skips a division with nothing to label it', () => {
    expect(
      buildDivisionOptions([{ id: 'x', name: '', display_division: '', division_weight: 1 }])
    ).toEqual([]);
  });

  it('falls back to the real name when no display name is set', () => {
    const [only] = buildDivisionOptions([
      { id: 'x', name: 'Rec Night', display_division: '', division_weight: 1 },
    ]);
    expect(only.label).toBe('Rec Night');
  });

  it('never offers a Hidden division', () => {
    expect(
      buildDivisionOptions([
        { id: 'h1', name: 'Hidden', display_division: 'Hidden', division_weight: 1 },
        { id: 'h2', name: 'Hidden2', display_division: 'Hidden2', division_weight: 1 },
      ])
    ).toEqual([]);
  });

  it('shortens the three league divisions for the chip row', () => {
    const [comp, int, rec] = buildDivisionOptions([
      { id: 'c', name: 'Competitive', display_division: 'Competitive', division_weight: 3 },
      { id: 'i', name: 'Intermediate', display_division: 'Intermediate', division_weight: 2 },
      { id: 'r', name: 'Recreational', display_division: 'Recreational', division_weight: 1 },
    ]);
    expect([comp.shortLabel, int.shortLabel, rec.shortLabel]).toEqual(['Comp', 'Int', 'Rec']);
  });
});

describe('matchIsInDivision', () => {
  it('keeps a match played entirely inside the division', () => {
    expect(matchIsInDivision(match('div-comp-hi', 'div-comp-lo'), competitive)).toBe(true);
  });

  it('keeps a cross-division match under either chip', () => {
    const cross = match('div-comp-hi', 'div-int');
    expect(matchIsInDivision(cross, competitive)).toBe(true);
    expect(matchIsInDivision(cross, intermediate)).toBe(true);
  });

  it('drops a match from a division it has nothing to do with', () => {
    expect(matchIsInDivision(match('div-int', 'div-int'), competitive)).toBe(false);
  });

  it('drops a match whose teams have no division at all', () => {
    expect(matchIsInDivision(match(null, null), competitive)).toBe(false);
  });
});

describe('matchInvolvesTeam', () => {
  it('finds the team on either side', () => {
    expect(matchInvolvesTeam(match('div-int', 'div-int'), 't1')).toBe(true);
    expect(matchInvolvesTeam(match('div-int', 'div-int'), 't2')).toBe(true);
  });

  it('leaves out a match the team is not in', () => {
    expect(matchInvolvesTeam(match('div-int', 'div-int'), 't9')).toBe(false);
  });

  it('falls back to the plain ids when the team details did not load', () => {
    const bare = { id: 'm1', team1Id: 't1', team2Id: 't2' } as Match;
    expect(matchInvolvesTeam(bare, 't2')).toBe(true);
  });
});

describe('timeslot predicates', () => {
  it('matches a timeslot row on its division name', () => {
    expect(timeslotIsInDivision(timeslotRow('t1', 'Competitive High'), competitive)).toBe(true);
    expect(timeslotIsInDivision(timeslotRow('t1', 'Intermediate'), competitive)).toBe(false);
  });

  it('is not fooled by capitalisation', () => {
    expect(timeslotIsInDivision(timeslotRow('t1', 'COMPETITIVE LOW'), competitive)).toBe(true);
  });

  it('drops a row with no division named', () => {
    expect(timeslotIsInDivision(timeslotRow('t1', null), competitive)).toBe(false);
  });

  it('matches a row on its team', () => {
    expect(timeslotInvolvesTeam(timeslotRow('t1', 'Intermediate'), 't1')).toBe(true);
    expect(timeslotInvolvesTeam(timeslotRow('t1', 'Intermediate'), 't2')).toBe(false);
  });
});

describe('filterGroupedTimeslots', () => {
  const grouped = {
    '6:30 PM': [timeslotRow('t1', 'Competitive High'), timeslotRow('t3', 'Intermediate')],
    '7:00 PM': [timeslotRow('t4', 'Intermediate')],
  };

  it('hands the night back untouched when no chip is on', () => {
    expect(filterGroupedTimeslots(grouped, { division: null, teamId: null })).toBe(grouped);
  });

  it('keeps only the rows in the chosen division', () => {
    const result = filterGroupedTimeslots(grouped, { division: competitive, teamId: null });
    expect(Object.keys(result)).toEqual(['6:30 PM']);
    expect(result['6:30 PM']).toHaveLength(1);
  });

  it('drops a time that empties out entirely', () => {
    const result = filterGroupedTimeslots(grouped, { division: competitive, teamId: null });
    expect(result['7:00 PM']).toBeUndefined();
  });

  it('narrows to one team across every time', () => {
    const result = filterGroupedTimeslots(grouped, { division: null, teamId: 't4' });
    expect(Object.keys(result)).toEqual(['7:00 PM']);
  });

  it('applies both chips together', () => {
    const result = filterGroupedTimeslots(grouped, { division: competitive, teamId: 't3' });
    expect(result).toEqual({});
  });
});
