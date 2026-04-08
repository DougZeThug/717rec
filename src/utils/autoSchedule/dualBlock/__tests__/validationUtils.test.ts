import { describe, expect, it } from 'vitest';

import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

import { validateDualBlockSchedule } from '../validationUtils';

const t1 = createMockTeam({ id: 't1', name: 'Team Alpha' });
const t2 = createMockTeam({ id: 't2', name: 'Team Beta' });
const t3 = createMockTeam({ id: 't3', name: 'Team Gamma' });
const t4 = createMockTeam({ id: 't4', name: 'Team Delta' });

describe('validateDualBlockSchedule', () => {
  it('returns isValid=true with empty arrays for a valid schedule (happy path)', () => {
    const primary = [createMockTeamPairing({ team1: t1, team2: t2 })];
    const secondary = [createMockTeamPairing({ team1: t3, team2: t4 })];

    const result = validateDualBlockSchedule(primary, secondary);

    expect(result.isValid).toBe(true);
    expect(result.teamsWithDuplicateOpponents).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns isValid=false when the same pair appears in both blocks', () => {
    const pairing = createMockTeamPairing({ team1: t1, team2: t2 });

    const result = validateDualBlockSchedule([pairing], [pairing]);

    expect(result.isValid).toBe(false);
    expect(result.teamsWithDuplicateOpponents).toContain('t1');
    expect(result.teamsWithDuplicateOpponents).toContain('t2');
  });

  it('generates a warning containing the team name for duplicate opponents', () => {
    const pairing = createMockTeamPairing({ team1: t1, team2: t2 });

    const result = validateDualBlockSchedule([pairing], [pairing]);

    expect(result.warnings.length).toBeGreaterThan(0);
    // Warning should mention at least one of the team names
    const warningsText = result.warnings.join(' ');
    expect(warningsText).toMatch(/Team Alpha|Team Beta/);
  });

  it('generates an error message counting the number of duplicate teams', () => {
    const pairing = createMockTeamPairing({ team1: t1, team2: t2 });

    const result = validateDualBlockSchedule([pairing], [pairing]);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/2 teams/);
  });

  it('returns isValid=true for empty arrays (edge)', () => {
    const result = validateDualBlockSchedule([], []);

    expect(result.isValid).toBe(true);
    expect(result.teamsWithDuplicateOpponents).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('overbookedTeams is always empty (current implementation)', () => {
    const pairing = createMockTeamPairing({ team1: t1, team2: t2 });

    const result = validateDualBlockSchedule([pairing], [pairing]);

    expect(result.overbookedTeams).toHaveLength(0);
  });

  it('flags all 4 teams when both pairs are duplicated', () => {
    const pairing1 = createMockTeamPairing({ team1: t1, team2: t2 });
    const pairing2 = createMockTeamPairing({ team1: t3, team2: t4 });

    const result = validateDualBlockSchedule([pairing1, pairing2], [pairing1, pairing2]);

    expect(result.teamsWithDuplicateOpponents).toHaveLength(4);
  });
});
