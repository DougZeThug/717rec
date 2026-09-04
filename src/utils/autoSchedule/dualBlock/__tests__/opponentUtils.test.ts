import { describe, expect, it } from 'vitest';

import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

import { findTeamsWithSameOpponent } from '../opponentUtils';

// Build distinct teams for use in tests
const t1 = createMockTeam({ id: 't1', name: 'T1' });
const t2 = createMockTeam({ id: 't2', name: 'T2' });
const t3 = createMockTeam({ id: 't3', name: 'T3' });
const t4 = createMockTeam({ id: 't4', name: 'T4' });
const t5 = createMockTeam({ id: 't5', name: 'T5' });

describe('findTeamsWithSameOpponent', () => {
  it('returns empty array when all opponents are different (happy path)', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t3, team2: t4 })];

    expect(findTeamsWithSameOpponent(primary, secondary)).toEqual([]);
  });

  it('returns both team IDs when the same pair appears in both blocks', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t1, team2: t2 })];

    const result = findTeamsWithSameOpponent(primary, secondary);

    expect(result).toContain('t1');
    expect(result).toContain('t2');
  });

  it('only flags the pair with duplicate, not others', () => {
    const primary = [
      createMockTeamPairing({ team1: t1, team2: t2 }),
      createMockTeamPairing({ team1: t3, team2: t4 }),
    ];
    const secondary = [
      createMockTeamPairing({ team1: t1, team2: t2 }), // duplicate
      createMockTeamPairing({ team1: t3, team2: t5 }), // different
    ];

    const result = findTeamsWithSameOpponent(primary, secondary);

    expect(result).toContain('t1');
    expect(result).toContain('t2');
    expect(result).not.toContain('t3');
    expect(result).not.toContain('t4');
  });

  it('returns empty array when primary is empty', () => {
    const secondary = [createMockTeamPairing({ team1: t1, team2: t2 })];

    expect(findTeamsWithSameOpponent([], secondary)).toEqual([]);
  });

  it('returns empty array when secondary is empty', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];

    expect(findTeamsWithSameOpponent(primary, [])).toEqual([]);
  });

  it('does not duplicate team IDs in result even if they appear multiple times', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t1, team2: t2 })];

    const result = findTeamsWithSameOpponent(primary, secondary);
    const uniqueResult = [...new Set(result)];

    expect(result).toHaveLength(uniqueResult.length);
  });
});
