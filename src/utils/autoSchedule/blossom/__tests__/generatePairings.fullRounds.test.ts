import { describe, expect, it, vi } from 'vitest';

import type { TeamPairing } from '@/types/autoSchedule';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { scheduleLog } from '@/utils/logger';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { generatePairingsWithBlossom } from '../generatePairings';
import { splitsIntoTwoSlots, usesOnlyAllowedEdges } from '../validation';

// Real Blossom. Only the network and the logger are faked.
vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

// A block of 6 with 2 Competitive, 3 Intermediate and 1 Recreational team (the 1/2/1 mix; it is
// block 2 of the seeded grid). Competitive teams may not play the Recreational team. Round 2
// can be the smaller round T1-T3 and T2-T5 (15 points), or the full round T1-T3, T2-T4 and
// T5-T6 (also 15 points). The library may take either. The smaller one leaves T4 and T6 (both
// Competitive) without a partner, and the repair step then cannot fix it without a rule bend.
const blockOf6 = [
  'T1:Intermediate',
  'T2:Intermediate',
  'T3:Recreational',
  'T4:Competitive',
  'T5:Intermediate',
  'T6:Competitive',
];

/** The clean list: two full rounds, no pair that bends a rule, and Apply can split it. */
const cleanList = ['T1-T5|10', 'T2-T3|5', 'T4-T6|10', 'T1-T3|5', 'T2-T4|5', 'T5-T6|5'];

const teams = () =>
  blockOf6.map((entry) => {
    const [id, divisionName] = entry.split(':');
    return createMockTeam({ id, name: id, divisionName });
  });

const generate = (preferFullRounds?: boolean) =>
  generatePairingsWithBlossom(teams(), {
    avoidRematches: true,
    getCompatibilityScoreFn: calculateDivisionOnlyCompatibility,
    playedPairsSet: new Set<string>(),
    ...(preferFullRounds === undefined ? {} : { preferFullRounds }),
  });

const describePairs = (pairings: TeamPairing[]) =>
  pairings.map(
    (pairing) => `${pairing.team1.id}-${pairing.team2.id}|${pairing.compatibilityScore}`
  );

const runsStarted = () =>
  vi
    .mocked(scheduleLog)
    .mock.calls.filter(([message]) => message === 'Starting Blossom algorithm for 6 teams').length;

describe('generatePairingsWithBlossom, preferFullRounds', () => {
  it('without the flag, the first run leaves teams out and the retry finds the clean list', async () => {
    const pairings = await generate();

    expect(runsStarted()).toBe(2);
    expect(describePairs(pairings)).toEqual(cleanList);
    expect(usesOnlyAllowedEdges(pairings)).toBe(true);
    expect(splitsIntoTwoSlots(pairings)).toBe(true);
  });

  it('with the flag, the first run already pairs every team in each round', async () => {
    const pairings = await generate(true);

    // One run, not two: the first run itself gave the clean list.
    expect(runsStarted()).toBe(1);
    expect(describePairs(pairings)).toEqual(cleanList);
    expect(usesOnlyAllowedEdges(pairings)).toBe(true);
    expect(splitsIntoTwoSlots(pairings)).toBe(true);
  });

  it('with the flag false, the run is the same as with no flag', async () => {
    const unset = await generate();
    vi.mocked(scheduleLog).mockClear();
    const off = await generate(false);

    expect(describePairs(off)).toEqual(describePairs(unset));
    expect(runsStarted()).toBe(2);
  });
});
