import { describe, expect, it, vi } from 'vitest';

import type { TeamPairing } from '@/types/autoSchedule';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { errorLog, scheduleLog, warnLog } from '@/utils/logger';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { generatePairingsWithBlossom } from '../generatePairings';
import { splitsIntoTwoSlots, usesOnlyAllowedEdges } from '../validation';

/**
 * A simulated browser. In a browser build edmonds-blossom 1.0.0 is strict code, and it throws
 * "ReferenceError: b is not defined" as soon as a round needs a blossom contraction. matchingRunner
 * catches that and the round returns no pairs, so the greedy repair takes over. Here the original
 * library throws on EVERY call, which is the worst case. The vendored strict-mode copy, used only
 * by the retry, stays real.
 */
vi.mock('edmonds-blossom', () => ({
  default: vi.fn(() => {
    throw new ReferenceError('b is not defined');
  }),
}));

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

/** One block of teams, in list order. A team is "A6" (no division) or "A4:Cuspers". */
type Block = { teams: string[]; history: string[] };

const buildTeams = (entries: string[]) =>
  entries.map((entry) => {
    const [id, division] = entry.split(':');
    return createMockTeam({ id, name: id, division, divisionName: division });
  });

/** Generate one block the way standardPairing.ts does, with the block's history as played pairs. */
const generate = (block: Block) =>
  generatePairingsWithBlossom(buildTeams(block.teams), {
    avoidRematches: true,
    getCompatibilityScoreFn: calculateDivisionOnlyCompatibility,
    playedPairsSet: new Set(block.history.map((pair) => pair.split('-').sort().join('-'))),
  });

/** Each pair as team1-team2|score|rematch flag, in the order the generator returned them. */
const describePairs = (pairings: TeamPairing[]) =>
  pairings.map(
    (pairing) =>
      `${pairing.team1.id}-${pairing.team2.id}|${pairing.compatibilityScore}|${pairing.hasPlayedBefore}`
  );

/** How many matches each team of the block plays, in the block's list order. */
const matchesPerTeam = (block: Block, pairings: TeamPairing[]) =>
  block.teams.map(
    (entry) =>
      pairings.filter(({ team1, team2 }) => [team1.id, team2.id].includes(entry.split(':')[0]))
        .length
  );

/** The pairs as sorted keys, so A-B and B-A are the same pair. */
const pairKeys = (pairings: TeamPairing[]) =>
  new Set(pairings.map(({ team1, team2 }) => [team1.id, team2.id].sort().join('-')));

/** How many times the generator started a run for a block of this size. */
const runsStarted = (teamCount: number) =>
  vi
    .mocked(scheduleLog)
    .mock.calls.filter(
      ([message]) => message === `Starting Blossom algorithm for ${teamCount} teams`
    ).length;

const retryNote = (teamCount: number) =>
  `Block of ${teamCount} teams: used perfect matchings after the first run failed`;

// The 6-team case from QA (same data as generatePairings.retry.test.ts).
const qaSixTeams: Block = {
  teams: [
    'A6',
    'A4:Cuspers',
    'A2:Intermediate',
    'A1:Competitive',
    'A3:Recreational',
    'A5:Recreational High',
  ],
  history: ['A1-A2', 'A3-A4'],
};
// n4-15 from the saved 4-team grid. In Node its first run works. In a browser the first run
// throws, because the original library crashes.
const mixedN4x15: Block = {
  teams: ['A4:Cuspers', 'A2:Recreational High', 'A1:Intermediate', 'A3:Recreational High'],
  history: [],
};
// No schedule that follows the rules exists for these two 6-team blocks.
const mixedN6x424: Block = {
  teams: [
    'A6:Competitive',
    'A2:Recreational',
    'A5:Recreational',
    'A3:Cuspers',
    'A4:Competitive',
    'A1:Cuspers',
  ],
  history: ['A6-A4'],
};
const mixedN6x394: Block = {
  teams: [
    'A1:Competitive',
    'A2:Competitive',
    'A6:Competitive',
    'A5:Recreational',
    'A4:Intermediate',
    'A3:Recreational High',
  ],
  history: ['A5-A6', 'A1-A6', 'A5-A1', 'A1-A3'],
};

describe('generatePairingsWithBlossom with a library that crashes like it does in a browser', () => {
  it.each([
    {
      name: 'the 6-team case from QA',
      block: qaSixTeams,
      pairs: [
        'A6-A1|0|false',
        'A4-A2|5|false',
        'A3-A5|10|false',
        'A6-A3|10|false',
        'A4-A1|0|false',
        'A2-A5|5|false',
      ],
    },
    {
      name: 'n4-15 (a 4-team block that works in Node)',
      block: mixedN4x15,
      pairs: ['A4-A3|10|false', 'A2-A1|5|false', 'A4-A1|5|false', 'A2-A3|10|false'],
    },
  ])(
    'still returns a rule-following list that Apply can split for $name',
    async ({ block, pairs }) => {
      const pairings = await generate(block);

      expect(describePairs(pairings)).toEqual(pairs);
      expect(matchesPerTeam(block, pairings)).toEqual(block.teams.map(() => 2));
      expect(pairKeys(pairings).size).toBe(pairings.length);
      expect(usesOnlyAllowedEdges(pairings)).toBe(true);
      expect(splitsIntoTwoSlots(pairings)).toBe(true);
      // The first run crashed in every round (the error is logged, not thrown) and failed.
      // The retry, which uses the strict-mode copy, gave the list.
      expect(errorLog).toHaveBeenCalledWith(
        'Blossom matching failed for round 1:',
        expect.any(ReferenceError)
      );
      expect(runsStarted(block.teams.length)).toBe(2);
      expect(warnLog).toHaveBeenCalledWith(retryNote(block.teams.length));
    }
  );

  it.each([
    {
      name: 'n6-424 (only a rematch between two Competitive teams would work)',
      block: mixedN6x424,
      message:
        "2 teams don't have 2 matches. Details: A2 (T3): 1/2 matches. Available opponents: 3, blocked by tier: 2, blocked by rematch: 0; A5 (T3): 1/2 matches. Available opponents: 3, blocked by tier: 2, blocked by rematch: 0",
    },
    {
      name: 'n6-394 (no rule-following list, and the second run fails too)',
      block: mixedN6x394,
      message:
        "2 teams don't have 2 matches. Details: A5 (T3): 1/2 matches. Available opponents: 2, blocked by tier: 3, blocked by rematch: 0; A3 (T3): 1/2 matches. Available opponents: 2, blocked by tier: 3, blocked by rematch: 0",
    },
  ])('still throws the same error as before for $name', async ({ block, message }) => {
    await expect(generate(block)).rejects.toThrowError(new Error(message));
    expect(runsStarted(6)).toBe(2);
    expect(warnLog).not.toHaveBeenCalledWith(retryNote(6));
  });
});
