import { describe, expect, it, vi } from 'vitest';

import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { balanceTeamsBetweenBlocks } from '../teamBalancer';

/** Helper: create teams with explicit IDs and power scores */
function makeTeams(specs: { id: string; power_score: number }[]) {
  return specs.map(({ id, power_score }) => createMockTeam({ id, name: id, power_score }));
}

describe('balanceTeamsBetweenBlocks', () => {
  it('returns both arrays unchanged when both are even (happy path)', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 80 },
      { id: 'p2', power_score: 60 },
    ]);
    const secondary = makeTeams([
      { id: 's1', power_score: 70 },
      { id: 's2', power_score: 50 },
    ]);

    const result = balanceTeamsBetweenBlocks(primary, secondary);

    expect(result.primaryAdjusted).toHaveLength(2);
    expect(result.secondaryAdjusted).toHaveLength(2);
    expect(result.unmatchedTeamIds).toHaveLength(0);
  });

  it('removes the lowest-ranked team from primary when primary is odd', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 40 }, // lowest
      { id: 'p2', power_score: 70 },
      { id: 'p3', power_score: 90 },
    ]);
    const secondary = makeTeams([
      { id: 's1', power_score: 60 },
      { id: 's2', power_score: 50 },
    ]);

    const result = balanceTeamsBetweenBlocks(primary, secondary, { unmatchedTeamStrategy: 'lowest-rank' });

    expect(result.primaryAdjusted).toHaveLength(2);
    expect(result.unmatchedTeamIds).toHaveLength(1);
    expect(result.unmatchedTeamIds[0]).toBe('p1'); // lowest power_score removed
    expect(result.primaryAdjusted.map((t) => t.id)).not.toContain('p1');
  });

  it('removes the lowest-ranked team from secondary when secondary is odd', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 80 },
      { id: 'p2', power_score: 60 },
    ]);
    const secondary = makeTeams([
      { id: 's1', power_score: 30 }, // lowest
      { id: 's2', power_score: 55 },
      { id: 's3', power_score: 75 },
    ]);

    const result = balanceTeamsBetweenBlocks(primary, secondary, { unmatchedTeamStrategy: 'lowest-rank' });

    expect(result.secondaryAdjusted).toHaveLength(2);
    expect(result.unmatchedTeamIds).toHaveLength(1);
    expect(result.unmatchedTeamIds[0]).toBe('s1');
  });

  it('removes one team from primary when both blocks are odd', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 20 }, // lowest
      { id: 'p2', power_score: 50 },
      { id: 'p3', power_score: 80 },
    ]);
    const secondary = makeTeams([
      { id: 's1', power_score: 40 },
      { id: 's2', power_score: 60 },
      { id: 's3', power_score: 90 },
    ]);

    const result = balanceTeamsBetweenBlocks(primary, secondary, { unmatchedTeamStrategy: 'lowest-rank' });

    expect(result.primaryAdjusted).toHaveLength(2);
    expect(result.unmatchedTeamIds).toHaveLength(1);
    expect(result.unmatchedTeamIds[0]).toBe('p1');
  });

  it('invokes notifyCallback with team name when a team is removed', () => {
    const primary = makeTeams([
      { id: 'weak', power_score: 10 },
      { id: 'p2', power_score: 50 },
      { id: 'p3', power_score: 80 },
    ]);
    const secondary = makeTeams([
      { id: 's1', power_score: 60 },
      { id: 's2', power_score: 40 },
    ]);
    const callback = vi.fn();

    balanceTeamsBetweenBlocks(primary, secondary, { unmatchedTeamStrategy: 'lowest-rank' }, callback);

    expect(callback).toHaveBeenCalledOnce();
    const callArg = callback.mock.calls[0][0];
    expect(callArg.description).toContain('weak');
  });

  it('does not crash when notifyCallback is omitted', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 10 },
      { id: 'p2', power_score: 50 },
      { id: 'p3', power_score: 80 },
    ]);
    const secondary = makeTeams([{ id: 's1', power_score: 60 }, { id: 's2', power_score: 40 }]);

    expect(() => balanceTeamsBetweenBlocks(primary, secondary)).not.toThrow();
  });

  it('does not mutate the original arrays', () => {
    const primary = makeTeams([
      { id: 'p1', power_score: 10 },
      { id: 'p2', power_score: 50 },
      { id: 'p3', power_score: 80 },
    ]);
    const secondary = makeTeams([{ id: 's1', power_score: 60 }, { id: 's2', power_score: 40 }]);
    const originalPrimaryLength = primary.length;
    const originalSecondaryLength = secondary.length;

    balanceTeamsBetweenBlocks(primary, secondary);

    expect(primary).toHaveLength(originalPrimaryLength);
    expect(secondary).toHaveLength(originalSecondaryLength);
  });

  it('handles empty primary with even secondary without crashing', () => {
    const secondary = makeTeams([{ id: 's1', power_score: 60 }, { id: 's2', power_score: 40 }]);

    const result = balanceTeamsBetweenBlocks([], secondary);

    expect(result.primaryAdjusted).toHaveLength(0);
    expect(result.secondaryAdjusted).toHaveLength(2);
    expect(result.unmatchedTeamIds).toHaveLength(0);
  });
});
