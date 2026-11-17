import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTeam, createMockTeamPairing } from '@/utils/test/autoSchedule/testHelpers';

vi.mock('../../blossom', () => ({
  generatePairingsWithBlossom: vi.fn(),
}));

import { generatePairingsWithBlossom } from '../../blossom';
import { generateDualBlockPairings } from '../pairingGenerator';

// Prioritize Match Quality asks the standard scheduler for full rounds. Dual Match Mode is not
// part of that, even when it is handed the same weights.
describe('generateDualBlockPairings and the full-rounds flag', () => {
  const p1 = createMockTeam({ id: 'p1', name: 'P1' });
  const p2 = createMockTeam({ id: 'p2', name: 'P2' });

  beforeEach(() => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValue([
      createMockTeamPairing({ team1: p1, team2: p2 }),
    ]);
  });

  it('calls the generator for both blocks without the flag, even when weights are sent', async () => {
    await generateDualBlockPairings(
      { Early: [p1, p2], Late: [p1, p2] },
      {
        primaryBlock: 'Early',
        secondaryBlock: 'Late',
        weights: { powerScoreWeight: 5, sosWeight: 3, recordWeight: 3.5, gameRecordWeight: 2 },
      },
      vi.fn().mockResolvedValue([])
    );

    expect(generatePairingsWithBlossom).toHaveBeenCalledTimes(2);
    for (const [, config] of vi.mocked(generatePairingsWithBlossom).mock.calls) {
      expect(config.preferFullRounds).toBeUndefined();
    }
  });
});
