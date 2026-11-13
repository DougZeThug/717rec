import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchSeasonHistoryForTeams } from '@/services/matches/SchedulingHistoryService';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossom';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

vi.mock('@/utils/autoSchedule/blossom', () => ({
  generatePairingsWithBlossom: vi.fn(),
}));

// Both history functions are stand-ins with their own identity, so the test can tell
// the right one from the wrong one.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const teams = ['team-a', 'team-b', 'team-c', 'team-d'].map((id) =>
  createMockTeam({ id, name: id })
);

/** The config that scheduleStandardPairings handed to the Blossom generator for the first block. */
const firstBlockConfig = () => {
  const call = vi.mocked(generatePairingsWithBlossom).mock.calls[0];
  if (!call) throw new Error('generatePairingsWithBlossom was not called');
  return call[1];
};

describe('scheduleStandardPairings', () => {
  beforeEach(() => {
    vi.mocked(generatePairingsWithBlossom).mockResolvedValue([]);
  });

  it('builds the played-pairs set from the history it is given, whichever team is listed first', async () => {
    // Listed in both orders: the key is the two ids sorted, so order must not matter.
    const historyPairs: [string, string][] = [
      ['team-b', 'team-a'],
      ['team-c', 'team-d'],
    ];

    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, historyPairs);

    const playedPairsSet = firstBlockConfig().playedPairsSet;
    expect(playedPairsSet).toBeInstanceOf(Set);
    expect([...(playedPairsSet ?? [])].sort()).toEqual(['team-a-team-b', 'team-c-team-d']);
    expect(playedPairsSet?.has('team-b-team-a')).toBe(false);
  });

  it("hands the generator the service's fetchSeasonHistoryForTeams as its history lookup", async () => {
    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, []);

    expect(firstBlockConfig().fetchSeasonHistoryFn).toBe(fetchSeasonHistoryForTeams);
  });

  it('passes the rematch setting through to the generator', async () => {
    await scheduleStandardPairings({ '6:30': teams }, { avoidRematches: true }, []);

    expect(firstBlockConfig().avoidRematches).toBe(true);
  });
});
