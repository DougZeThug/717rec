import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/styles/design-system/divisions', () => ({
  getDisplayDivision: vi.fn(() => 'Competitive'),
}));

import { Team } from '@/types';

import { groupTeamsByDisplayDivision, groupTeamsByDivision } from '../teamGrouping';

function makeTeam(id: string, overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: `Team ${id}`,
    division_id: null,
    division: null,
    divisionName: null,
    ...overrides,
  } as Team;
}

describe('groupTeamsByDivision', () => {
  it('groups teams by division_id', () => {
    const teams = [
      makeTeam('a', { division_id: 'div-1' }),
      makeTeam('b', { division_id: 'div-1' }),
      makeTeam('c', { division_id: 'div-2' }),
    ];
    const result = groupTeamsByDivision(teams);
    expect(result['div-1']).toHaveLength(2);
    expect(result['div-2']).toHaveLength(1);
  });

  it('falls back to division field when division_id is null', () => {
    const teams = [makeTeam('a', { division_id: null, division: 'Competitive' })];
    const result = groupTeamsByDivision(teams);
    expect(result['Competitive']).toHaveLength(1);
  });

  it('falls back to "unassigned" when both fields are null', () => {
    const teams = [makeTeam('a', { division_id: null, division: null })];
    const result = groupTeamsByDivision(teams);
    expect(result['unassigned']).toHaveLength(1);
  });

  it('returns empty object for empty teams array', () => {
    expect(groupTeamsByDivision([])).toEqual({});
  });
});

describe('groupTeamsByDisplayDivision', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groups teams by divisionName', () => {
    const teams = [
      makeTeam('a', { divisionName: 'Competitive' }),
      makeTeam('b', { divisionName: 'Competitive' }),
      makeTeam('c', { divisionName: 'Recreational' }),
    ];
    const result = groupTeamsByDisplayDivision(teams, []);
    expect(result['Competitive']).toHaveLength(2);
    expect(result['Recreational']).toHaveLength(1);
  });

  it('skips teams with displayDivision === "Hidden"', () => {
    const teams = [
      makeTeam('a', { divisionName: 'Hidden' }),
      makeTeam('b', { divisionName: 'Competitive' }),
    ];
    const result = groupTeamsByDisplayDivision(teams, []);
    expect(result['Hidden']).toBeUndefined();
    expect(result['Competitive']).toHaveLength(1);
  });

  it('falls back to division lookup when divisionName is null', () => {
    const divisions = [{ id: 'div-1', display_division: 'Intermediate', name: 'Intermediate' }];
    const teams = [makeTeam('a', { divisionName: null, division_id: 'div-1' })];
    const result = groupTeamsByDisplayDivision(teams, divisions);
    expect(result['Intermediate']).toHaveLength(1);
  });
});
