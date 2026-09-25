import { describe, expect, it } from 'vitest';

import { teamsInDisplayDivision } from '../divisionFilter';

const divisions = [
  { id: 'comp', name: 'Competitive', display_division: 'Competitive' },
  { id: 'comp-high', name: 'Competitive High', display_division: 'Competitive' },
  { id: 'rec', name: 'Recreational', display_division: 'Recreational' },
  { id: 'legacy', name: 'Legacy' },
];

const teams = [
  { id: 't1', division_id: 'comp' },
  { id: 't2', division_id: 'comp-high' },
  { id: 't3', division_id: 'rec' },
  { id: 't4', division_id: 'legacy' },
  { id: 't5', division_id: null },
];

describe('teamsInDisplayDivision', () => {
  it('keeps every team of the display division the picked division belongs to', () => {
    expect(teamsInDisplayDivision(teams, divisions, 'comp')).toEqual({
      label: 'Competitive',
      teams: [teams[0], teams[1]],
    });
    expect(teamsInDisplayDivision(teams, divisions, 'comp-high')?.teams).toEqual([
      teams[0],
      teams[1],
    ]);
  });

  it('falls back to the division name when it has no display division', () => {
    expect(teamsInDisplayDivision(teams, divisions, 'legacy')).toEqual({
      label: 'Legacy',
      teams: [teams[3]],
    });
  });

  it('leaves out teams with no division', () => {
    expect(teamsInDisplayDivision(teams, divisions, 'rec')?.teams).toEqual([teams[2]]);
  });

  it('returns null for a division it does not know', () => {
    expect(teamsInDisplayDivision(teams, divisions, 'missing')).toBeNull();
  });
});
