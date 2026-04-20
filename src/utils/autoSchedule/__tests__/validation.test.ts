import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../matchHistoryService', () => ({
  haveTeamsPlayedBefore: vi.fn().mockResolvedValue(false),
}));

import { AutoScheduleMatch } from '@/types/autoSchedule';

import {
  calculateScheduleHealth,
  findTeamConflicts,
  getValidationSummary,
  validateMatchSchedule,
  ValidationResult,
} from '../validation';

function makeMatch(overrides: Partial<AutoScheduleMatch> = {}): AutoScheduleMatch {
  return {
    id: 'match-1',
    team1Id: 'team-a',
    team2Id: 'team-b',
    timeslot: 'S1',
    date: new Date('2025-06-15'),
    ...overrides,
  };
}

describe('findTeamConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' }),
      makeMatch({ id: '2', team1Id: 'c', team2Id: 'd', timeslot: 'S2' }),
    ];
    expect(findTeamConflicts(matches)).toHaveLength(0);
  });

  it('detects a team in two matches at the same timeslot', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' }),
      makeMatch({ id: '2', team1Id: 'a', team2Id: 'c', timeslot: 'S1' }),
    ];
    const conflicts = findTeamConflicts(matches);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].teamId).toBe('a');
    expect(conflicts[0].matchIds).toHaveLength(2);
  });

  it('does not flag a team in different timeslots', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' }),
      makeMatch({ id: '2', team1Id: 'a', team2Id: 'c', timeslot: 'S2' }),
    ];
    expect(findTeamConflicts(matches)).toHaveLength(0);
  });
});

describe('getValidationSummary', () => {
  it('returns valid message when isValid is true', () => {
    const result: ValidationResult = { isValid: true, errors: [], warnings: [] };
    expect(getValidationSummary(result)).toBe('Schedule is valid with no conflicts');
  });

  it('reports error count correctly (plural)', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [
        { matchId: '1', type: 'same-team', message: 'err1', severity: 'error' },
        { matchId: '2', type: 'same-team', message: 'err2', severity: 'error' },
      ],
      warnings: [{ matchId: '1', type: 'rematch', message: 'warn1' }],
    };
    const summary = getValidationSummary(result);
    expect(summary).toContain('2 errors');
    expect(summary).toContain('1 warning');
  });

  it('reports singular error correctly', () => {
    const result: ValidationResult = {
      isValid: false,
      errors: [{ matchId: '1', type: 'same-team', message: 'err', severity: 'error' }],
      warnings: [],
    };
    expect(getValidationSummary(result)).toContain('1 error');
    expect(getValidationSummary(result)).not.toContain('1 errors');
  });
});

describe('validateMatchSchedule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns isValid true for a clean schedule', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' })];
    const result = await validateMatchSchedule(matches);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects same-team error', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'a', timeslot: 'S1' })];
    const result = await validateMatchSchedule(matches);
    expect(result.errors.some((e) => e.type === 'same-team')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('detects invalid-timeslot error', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '' })];
    const result = await validateMatchSchedule(matches);
    expect(result.errors.some((e) => e.type === 'invalid-timeslot')).toBe(true);
  });

  it('adds rematch warning when haveTeamsPlayedBefore returns true', async () => {
    const { haveTeamsPlayedBefore } = await import('../matchHistoryService');
    vi.mocked(haveTeamsPlayedBefore).mockResolvedValue(true);
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' })];
    const result = await validateMatchSchedule(matches);
    expect(result.warnings.some((w) => w.type === 'rematch')).toBe(true);
  });
});

describe('calculateScheduleHealth', () => {
  beforeEach(async () => {
    const { haveTeamsPlayedBefore } = await import('../matchHistoryService');
    vi.mocked(haveTeamsPlayedBefore).mockResolvedValue(false);
  });

  it('returns 0 for empty match list', async () => {
    expect(await calculateScheduleHealth([])).toBe(0);
  });

  it('returns 100 for a clean schedule', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'S1' })];
    expect(await calculateScheduleHealth(matches)).toBe(100);
  });

  it('deducts 20 per error', async () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'a', timeslot: 'S1' }), // same-team error
    ];
    const health = await calculateScheduleHealth(matches);
    expect(health).toBeLessThanOrEqual(80);
  });
});
