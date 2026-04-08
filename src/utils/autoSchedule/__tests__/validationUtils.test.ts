import { describe, expect, it } from 'vitest';

import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import {
  logCrossBlockViolations,
  validateNoCrossBlockMatches,
  type CrossBlockViolation,
} from '../validationUtils';

/** Minimal AutoScheduleMatch shape used by validateNoCrossBlockMatches */
function makeMatch(id: string, team1Id: string, team2Id: string, timeslot = '6:30 PM') {
  return { id, team1Id, team2Id, timeslot } as Parameters<
    typeof validateNoCrossBlockMatches
  >[0][number];
}

describe('validateNoCrossBlockMatches', () => {
  it('returns isValid=true and no violations for same-block teams (happy path)', () => {
    const matches = [makeMatch('m1', 't1', 't2')];
    const teamBlockMap = { t1: ['Early'], t2: ['Early'] };
    const teams = [
      createMockTeam({ id: 't1', name: 'Team 1' }),
      createMockTeam({ id: 't2', name: 'Team 2' }),
    ];

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('detects cross-block violation when teams are in different non-overlapping blocks', () => {
    const matches = [makeMatch('m1', 't1', 't2')];
    const teamBlockMap = { t1: ['SuperEarly'], t2: ['LateMid'] };
    const teams = [
      createMockTeam({ id: 't1', name: 'Team 1' }),
      createMockTeam({ id: 't2', name: 'Team 2' }),
    ];

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.isValid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].matchId).toBe('m1');
  });

  it('double-header team sharing one common block is valid', () => {
    const matches = [makeMatch('m1', 't1', 't2')];
    // t1 is in Early and Mid; t2 is in Mid — they share Mid
    const teamBlockMap = { t1: ['Early', 'Mid'], t2: ['Mid'] };
    const teams = [
      createMockTeam({ id: 't1', name: 'Team 1' }),
      createMockTeam({ id: 't2', name: 'Team 2' }),
    ];

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('treats team missing from block map as a violation', () => {
    const matches = [makeMatch('m1', 't1', 't2')];
    const teamBlockMap = { t1: ['Early'] }; // t2 missing
    const teams = [
      createMockTeam({ id: 't1', name: 'Team 1' }),
      createMockTeam({ id: 't2', name: 'Team 2' }),
    ];

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.isValid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].team2.block).toBe('MISSING');
  });

  it('returns isValid=true for empty matches array', () => {
    const result = validateNoCrossBlockMatches([], { t1: ['Early'] }, []);

    expect(result.isValid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('violation includes correct team names from the teams array', () => {
    const matches = [makeMatch('m1', 't1', 't2')];
    const teamBlockMap = { t1: ['Block A'], t2: ['Block B'] };
    const teams = [
      createMockTeam({ id: 't1', name: 'Alpha' }),
      createMockTeam({ id: 't2', name: 'Beta' }),
    ];

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.violations[0].team1.name).toBe('Alpha');
    expect(result.violations[0].team2.name).toBe('Beta');
  });

  it('handles multiple matches with mixed validity', () => {
    const matches = [
      makeMatch('m1', 't1', 't2'), // same block — valid
      makeMatch('m2', 't3', 't4'), // different blocks — violation
    ];
    const teamBlockMap = {
      t1: ['Early'],
      t2: ['Early'],
      t3: ['Early'],
      t4: ['Late'],
    };
    const teams = ['t1', 't2', 't3', 't4'].map((id) => createMockTeam({ id, name: id }));

    const result = validateNoCrossBlockMatches(matches, teamBlockMap, teams);

    expect(result.isValid).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].matchId).toBe('m2');
  });
});

describe('logCrossBlockViolations', () => {
  it('does not throw for empty violations array', () => {
    expect(() => logCrossBlockViolations([])).not.toThrow();
  });

  it('does not throw for a single violation', () => {
    const violation: CrossBlockViolation = {
      matchId: 'm1',
      team1: { id: 't1', name: 'Team 1', block: 'Early' },
      team2: { id: 't2', name: 'Team 2', block: 'Late' },
      timeslot: '6:30 PM',
    };

    expect(() => logCrossBlockViolations([violation])).not.toThrow();
  });
});
