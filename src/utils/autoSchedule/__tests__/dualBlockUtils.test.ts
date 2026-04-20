import { describe, expect, it } from 'vitest';

import { Team } from '@/types';
import { DualBlockConfig } from '@/types/autoSchedule';

import {
  balanceTeamsBetweenBlocks,
  createTimeBlockPairs,
  findCommonTeams,
  handleOddTeamCount,
  validateDualBlockTeams,
} from '../dualBlockUtils';

function makeTeam(id: string, power_score = 50): Team {
  return { id, name: `Team ${id}`, power_score } as Team;
}

const DEFAULT_CONFIG: DualBlockConfig = {
  primaryBlock: 'Early',
  secondaryBlock: 'Late',
};

describe('validateDualBlockTeams', () => {
  it('returns isValid true when both blocks have teams', () => {
    const timeBlockTeams = {
      Early: [makeTeam('a'), makeTeam('b')],
      Late: [makeTeam('c'), makeTeam('d')],
    };
    const result = validateDualBlockTeams(timeBlockTeams, DEFAULT_CONFIG);
    expect(result.isValid).toBe(true);
  });

  it('returns isValid false when primary block is empty', () => {
    const timeBlockTeams = { Early: [], Late: [makeTeam('a')] };
    const result = validateDualBlockTeams(timeBlockTeams, DEFAULT_CONFIG);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid false when secondary block is empty', () => {
    const timeBlockTeams = { Early: [makeTeam('a')], Late: [] };
    const result = validateDualBlockTeams(timeBlockTeams, DEFAULT_CONFIG);
    expect(result.isValid).toBe(false);
  });

  it('returns isValid true with warning when team counts differ', () => {
    const timeBlockTeams = {
      Early: [makeTeam('a'), makeTeam('b'), makeTeam('c')],
      Late: [makeTeam('d'), makeTeam('e')],
    };
    const result = validateDualBlockTeams(timeBlockTeams, DEFAULT_CONFIG);
    expect(result.isValid).toBe(true);
    expect(result.warningMessages).toHaveLength(1);
  });
});

describe('handleOddTeamCount', () => {
  it('removes one team and returns the rest', () => {
    const teams = [makeTeam('a'), makeTeam('b'), makeTeam('c')];
    const config: DualBlockConfig = { unmatchedTeamStrategy: 'random' };
    const { adjustedTeams, unmatchedTeamId } = handleOddTeamCount(teams, config);
    expect(adjustedTeams).toHaveLength(2);
    expect(unmatchedTeamId).toBeTruthy();
  });

  it('removes lowest-rank team with lowest-rank strategy', () => {
    const teams = [makeTeam('a', 80), makeTeam('b', 40), makeTeam('c', 60)];
    const config: DualBlockConfig = { unmatchedTeamStrategy: 'lowest-rank' };
    const { unmatchedTeamId } = handleOddTeamCount(teams, config);
    expect(unmatchedTeamId).toBe('b'); // lowest power_score
  });

  it('removes highest-rank team with highest-rank strategy', () => {
    const teams = [makeTeam('a', 80), makeTeam('b', 40), makeTeam('c', 60)];
    const config: DualBlockConfig = { unmatchedTeamStrategy: 'highest-rank' };
    const { unmatchedTeamId } = handleOddTeamCount(teams, config);
    expect(unmatchedTeamId).toBe('a'); // highest power_score
  });
});

describe('createTimeBlockPairs', () => {
  it('returns a paired map with primary and secondary teams', () => {
    const timeBlockTeams = {
      Early: [makeTeam('a'), makeTeam('b')],
      Late: [makeTeam('c'), makeTeam('d')],
    };
    const result = createTimeBlockPairs(timeBlockTeams, DEFAULT_CONFIG);
    const pair = Object.values(result)[0];
    expect(pair.primaryBlock).toBe('Early');
    expect(pair.secondaryBlock).toBe('Late');
    expect(pair.primaryTeams).toHaveLength(2);
    expect(pair.secondaryTeams).toHaveLength(2);
  });
});

describe('balanceTeamsBetweenBlocks', () => {
  it('returns even-count teams unchanged', () => {
    const primary = [makeTeam('a'), makeTeam('b')];
    const secondary = [makeTeam('c'), makeTeam('d')];
    const { primaryAdjusted, secondaryAdjusted, unmatchedTeamIds } = balanceTeamsBetweenBlocks(
      primary,
      secondary
    );
    expect(primaryAdjusted).toHaveLength(2);
    expect(secondaryAdjusted).toHaveLength(2);
    expect(unmatchedTeamIds).toHaveLength(0);
  });

  it('removes one team from odd-count block and records the unmatched ID', () => {
    const primary = [makeTeam('a'), makeTeam('b'), makeTeam('c')]; // odd
    const secondary = [makeTeam('d'), makeTeam('e')];
    const { primaryAdjusted, unmatchedTeamIds } = balanceTeamsBetweenBlocks(primary, secondary);
    expect(primaryAdjusted).toHaveLength(2);
    expect(unmatchedTeamIds).toHaveLength(1);
  });
});

describe('findCommonTeams', () => {
  it('returns teams present in both blocks', () => {
    const primary = [makeTeam('a'), makeTeam('b')];
    const secondary = [makeTeam('b'), makeTeam('c')];
    const common = findCommonTeams(primary, secondary);
    expect(common).toHaveLength(1);
    expect(common[0].id).toBe('b');
  });

  it('returns empty array when no common teams', () => {
    const primary = [makeTeam('a')];
    const secondary = [makeTeam('b')];
    expect(findCommonTeams(primary, secondary)).toHaveLength(0);
  });
});
