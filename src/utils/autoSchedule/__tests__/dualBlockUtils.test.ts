import { describe, expect, it } from 'vitest';

import { Team } from '@/types';
import { DualBlockConfig } from '@/types/autoSchedule';

import { createTimeBlockPairs } from '../dualBlockUtils';

function makeTeam(id: string, power_score = 50): Team {
  return { id, name: `Team ${id}`, power_score } as Team;
}

const DEFAULT_CONFIG: DualBlockConfig = {
  primaryBlock: 'Early',
  secondaryBlock: 'Late',
};

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
