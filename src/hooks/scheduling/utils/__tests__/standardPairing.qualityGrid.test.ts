import { beforeAll, describe, expect, it, vi } from 'vitest';

import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import type { TeamPair } from '@/types/autoSchedule';
import {
  buildGridBlock,
  countRuleBends,
  GRID_MIXES,
  GRID_SIZES,
} from '@/utils/test/autoSchedule/qualityGrid';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

/**
 * The acceptance grid for Prioritize Match Quality: the same seeded blocks run with the switch
 * OFF and ON, through the real generator. ON must not bend more rules than OFF.
 *
 * A rule is bent by a Competitive team against a Recreational team, or by a repeated pair when
 * the two teams are not both Recreational.
 *
 * Mode "plain" is the library as it runs in Node. Mode "browser" simulates a browser where
 * edmonds-blossom 1.0.0 throws "b is not defined" on every call, the worst case (the same fake
 * as generatePairings.browserLibrary.test.ts). The vendored strict copy used by the retry stays
 * real in both.
 */
const browserLibrary = vi.hoisted(() => ({ throws: false }));

vi.mock('edmonds-blossom', async (importOriginal) => {
  const real = await importOriginal<{
    default: (edges: number[][], maxCardinality?: boolean) => number[];
  }>();
  return {
    default: vi.fn((edges: number[][], maxCardinality?: boolean) => {
      if (browserLibrary.throws) throw new ReferenceError('b is not defined');
      return real.default(edges, maxCardinality);
    }),
  };
});

vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(),
  haveTeamsPlayedBefore: vi.fn(),
}));

vi.mock('@/services/matches/MatchTeamLookupService', () => ({
  fetchTeamsByIds: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const SEEDS = 40;
const OFF = { avoidRematches: true };
const ON = {
  avoidRematches: true,
  weights: { powerScoreWeight: 5, sosWeight: 3, recordWeight: 3.5, gameRecordWeight: 2 },
};

/** The result of one night of one block: the rule bends, or the error the night stopped with. */
type Night = { bends: number; unmatched: string[] } | { failed: unknown };

const runNight = async (
  block: ReturnType<typeof buildGridBlock>,
  config: typeof OFF | typeof ON
): Promise<Night> => {
  vi.mocked(fetchTeamsByIds).mockResolvedValue(block.rows);
  try {
    const result = await scheduleStandardPairings({ Early: block.teams }, config, []);
    return {
      bends: countRuleBends(result.pairings.Early ?? []),
      unmatched: result.unmatchedTeamIds,
    };
  } catch (failed) {
    return { failed };
  }
};

/** Run SEEDS seeded blocks of one tier mix and size, OFF and ON. */
const runGridCase = async (mixName: string, size: number) => {
  const nights: Array<{ seed: number; off: Night; on: Night }> = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const block = buildGridBlock(GRID_MIXES[mixName], size, seed);
    nights.push({ seed, off: await runNight(block, OFF), on: await runNight(block, ON) });
  }
  return nights;
};

const sum = (numbers: number[]) => numbers.reduce((total, next) => total + next, 0);

/** Which seeds ended with more rule bends for ON than for OFF. */
const seedsWhereOnBendsMore = (nights: Awaited<ReturnType<typeof runGridCase>>) =>
  nights
    .filter(({ off, on }) => 'bends' in off && 'bends' in on && on.bends > off.bends)
    .map(({ seed }) => seed);

/**
 * Where the gate holds today, and where it does not. A case listed as a known gap is run with
 * `it.fails`: it passes while ON still bends more rules than OFF in some seeded block, and it
 * turns red when that is fixed, so the entry can then become a plain gate.
 * See "Quality switch result" in docs/untangle-decision-log.md for the cause and the numbers.
 */
type Case = { mix: string; size: number; knownGap: boolean };
const buildCases = (gaps: ReadonlySet<string>): Case[] =>
  Object.keys(GRID_MIXES).flatMap((mix) =>
    GRID_SIZES.map((size) => ({ mix, size, knownGap: gaps.has(`${mix} ${size}`) }))
  );

const MODES = [
  {
    mode: 'plain',
    throws: false,
    gaps: new Set(['1/2/1 6', '1/2/1 10', '2/2/2 6', '3/1/2 6']),
  },
  {
    mode: 'browser',
    throws: true,
    gaps: new Set(['1/2/1 6', '1/2/1 8', '1/2/1 10', '2/2/2 6', '2/2/2 8', '3/1/2 6', '3/1/2 10']),
  },
];

describe.each(MODES)('Prioritize Match Quality grid, $mode library', ({ throws, gaps }) => {
  describe.each(buildCases(gaps))('tier mix $mix, $size teams', ({ mix, size, knownGap }) => {
    let nights: Awaited<ReturnType<typeof runGridCase>>;

    beforeAll(async () => {
      browserLibrary.throws = throws;
      nights = await runGridCase(mix, size);
    });

    const gate = knownGap ? it.fails : it;

    gate(`ON bends no more rules than OFF in any of ${SEEDS} seeded blocks`, () => {
      expect(seedsWhereOnBendsMore(nights)).toEqual([]);
    });

    it('stops no more nights than OFF does, and a night that finishes leaves no team short', () => {
      const stopped = (night: Night) => ('failed' in night ? 1 : 0);

      expect(sum(nights.map(({ on }) => stopped(on)))).toBeLessThanOrEqual(
        sum(nights.map(({ off }) => stopped(off)))
      );
      for (const { on } of nights) {
        if ('unmatched' in on) expect(on.unmatched).toEqual([]);
      }
    });
  });
});

describe('countRuleBends, the counter the grid uses', () => {
  const team = (id: string, divisionName: string) => createMockTeam({ id, name: id, divisionName });
  const competitive = team('C1', 'Competitive');
  const intermediate = team('I1', 'Intermediate');
  const recreational = team('R1', 'Recreational');
  const otherRecreational = team('R2', 'Recreational');
  const pair = (team1: TeamPair['team1'], team2: TeamPair['team2'], hasPlayedBefore = false) => ({
    team1,
    team2,
    compatibilityScore: 5,
    hasPlayedBefore,
  });

  it('counts nothing for pairs that follow the rules', () => {
    expect(
      countRuleBends([pair(competitive, intermediate), pair(intermediate, recreational)])
    ).toBe(0);
  });

  it('counts a Competitive team against a Recreational team', () => {
    expect(countRuleBends([pair(competitive, recreational)])).toBe(1);
  });

  it('counts a pair flagged as played before, unless both teams are Recreational', () => {
    expect(countRuleBends([pair(competitive, intermediate, true)])).toBe(1);
    expect(countRuleBends([pair(recreational, otherRecreational, true)])).toBe(0);
  });

  it('counts the second listing of a pair, unless both teams are Recreational', () => {
    expect(countRuleBends([pair(competitive, intermediate), pair(intermediate, competitive)])).toBe(
      1
    );
    expect(
      countRuleBends([pair(recreational, otherRecreational), pair(otherRecreational, recreational)])
    ).toBe(0);
  });
});
