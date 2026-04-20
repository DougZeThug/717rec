import { describe, expect, it } from 'vitest';

import { Division, Team } from '@/types';

import {
  isDivisionArray,
  isDivisionIdValid,
  isTeamArray,
  isValidNumber,
  isValidString,
} from '../typeGuards';

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Team One',
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    division_id: null,
    division: null,
    divisionName: null,
    logoUrl: null,
    imageUrl: null,
    sos: null,
    power_score: null,
    win_percentage: 0,
    game_win_percentage: 0,
    created_at: new Date().toISOString(),
    close_match_losses: null,
    ...overrides,
  } as Team;
}

function makeDivision(overrides: Partial<Division> = {}): Division {
  return {
    id: 'div-1',
    name: 'Competitive',
    ...overrides,
  } as Division;
}

describe('isTeamArray', () => {
  it('returns true for a valid Team array', () => {
    expect(isTeamArray([makeTeam()])).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isTeamArray([])).toBe(true);
  });

  it('returns false for non-array', () => {
    expect(isTeamArray('not-an-array')).toBe(false);
    expect(isTeamArray(null)).toBe(false);
  });

  it('returns false when item is missing id', () => {
    expect(isTeamArray([{ name: 'Team' }])).toBe(false);
  });

  it('returns false when item is missing name', () => {
    expect(isTeamArray([{ id: 'x' }])).toBe(false);
  });

  it('returns false when id is not a string', () => {
    expect(isTeamArray([{ id: 123, name: 'Team' }])).toBe(false);
  });
});

describe('isDivisionArray', () => {
  it('returns true for a valid Division array', () => {
    expect(isDivisionArray([makeDivision()])).toBe(true);
  });

  it('returns true for empty array', () => {
    expect(isDivisionArray([])).toBe(true);
  });

  it('returns false for non-array', () => {
    expect(isDivisionArray(null)).toBe(false);
  });

  it('returns false when item is missing name', () => {
    expect(isDivisionArray([{ id: 'div-1' }])).toBe(false);
  });
});

describe('isDivisionIdValid', () => {
  const divisions = [makeDivision({ id: 'div-1' }), makeDivision({ id: 'div-2' })];

  it('returns true when id exists in divisions', () => {
    expect(isDivisionIdValid(divisions, 'div-1')).toBe(true);
  });

  it('returns false when id does not exist', () => {
    expect(isDivisionIdValid(divisions, 'div-99')).toBe(false);
  });

  it('returns false for non-string id', () => {
    expect(isDivisionIdValid(divisions, 123)).toBe(false);
    expect(isDivisionIdValid(divisions, null)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDivisionIdValid(divisions, '')).toBe(false);
  });
});

describe('isValidString', () => {
  it('returns true for a non-empty string', () => {
    expect(isValidString('hello')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isValidString('')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isValidString(0)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidString(null)).toBe(false);
  });
});

describe('isValidNumber', () => {
  it('returns true for finite numbers', () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(42)).toBe(true);
    expect(isValidNumber(-3.14)).toBe(true);
  });

  it('returns false for NaN', () => {
    expect(isValidNumber(NaN)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isValidNumber('42')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isValidNumber(null)).toBe(false);
  });
});
