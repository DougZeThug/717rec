import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../matchHistoryService', () => ({
  haveTeamsPlayedBefore: vi.fn().mockResolvedValue(false),
}));

import { AutoScheduleMatch } from '@/types/autoSchedule';

import { findTeamConflicts, validateMatchSchedule, ValidationResult } from '../validation';

function makeMatch(overrides: Partial<AutoScheduleMatch> = {}): AutoScheduleMatch {
  return {
    id: 'match-1',
    team1Id: 'team-a',
    team2Id: 'team-b',
    timeslot: '6:30 PM',
    date: new Date('2025-06-15'),
    ...overrides,
  };
}

describe('findTeamConflicts', () => {
  it('returns empty array when no conflicts', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '6:30 PM' }),
      makeMatch({ id: '2', team1Id: 'c', team2Id: 'd', timeslot: '7:00 PM' }),
    ];
    expect(findTeamConflicts(matches)).toHaveLength(0);
  });

  it('detects a team in two matches at the same timeslot', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '6:30 PM' }),
      makeMatch({ id: '2', team1Id: 'a', team2Id: 'c', timeslot: '6:30 PM' }),
    ];
    const conflicts = findTeamConflicts(matches);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].teamId).toBe('a');
    expect(conflicts[0].matchIds).toHaveLength(2);
  });

  it('does not flag a team in different timeslots', () => {
    const matches = [
      makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '6:30 PM' }),
      makeMatch({ id: '2', team1Id: 'a', team2Id: 'c', timeslot: '7:00 PM' }),
    ];
    expect(findTeamConflicts(matches)).toHaveLength(0);
  });
});

describe('validateMatchSchedule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns isValid true for a clean schedule', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '6:30 PM' })];
    const result = await validateMatchSchedule(matches);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('detects same-team error', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'a', timeslot: '6:30 PM' })];
    const result = await validateMatchSchedule(matches);
    expect(result.errors.some((e) => e.type === 'same-team')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('detects invalid-timeslot error', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '' })];
    const result = await validateMatchSchedule(matches);
    expect(result.errors.some((e) => e.type === 'invalid-timeslot')).toBe(true);
  });

  it('rejects a timeslot that is not a readable time, such as a block name', async () => {
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: 'SuperLate' })];
    const result = await validateMatchSchedule(matches);
    expect(result.errors.some((e) => e.type === 'invalid-timeslot')).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('adds rematch warning when haveTeamsPlayedBefore returns true', async () => {
    const { haveTeamsPlayedBefore } = await import('../matchHistoryService');
    vi.mocked(haveTeamsPlayedBefore).mockResolvedValue(true);
    const matches = [makeMatch({ id: '1', team1Id: 'a', team2Id: 'b', timeslot: '6:30 PM' })];
    const result = await validateMatchSchedule(matches);
    expect(result.warnings.some((w) => w.type === 'rematch')).toBe(true);
  });
});
