import { beforeAll, describe, expect, it, vi } from 'vitest';

import { fetchTeamsByIds } from '@/services/matches/MatchTeamLookupService';
import type { TeamPair } from '@/types/autoSchedule';
import { splitsIntoTwoSlots } from '@/utils/autoSchedule/blossom/validation';
import {
  buildGridBlock,
  countRuleBends,
  GRID_MIXES,
  GRID_SIZES,
} from '@/utils/test/autoSchedule/qualityGrid';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { scheduleStandardPairings } from '../standardPairing';

/**
 * The acceptance grid for Prioritize Match Quality: the same seeded blocks (40 for each tier mix
 * and block size) run with the switch OFF and ON, through the real generator.
 *
 * A list is CLEAN when no pair bends a rule: a Competitive team against a Recreational team, or
 * a repeated pair when the two teams are not both Recreational. A list is PLACEABLE when Apply
 * can put it into the block's two time slots (`splitsIntoTwoSlots`). A list that is clean but
 * not placeable cannot be saved, so only "clean AND placeable" counts as a good night.
 *
 * Three library modes. "plain" is the library as it runs in Node. "real browser" runs the
 * library and fails only when it would have thrown "b is not defined" in a strict-mode browser,
 * which is when a round needs a blossom contraction (it assigns the undeclared b, path or v).
 * "all-throw" is the worst case from generatePairings.browserLibrary.test.ts: the library throws
 * on every call. In all three the vendored strict copy, used for full rounds and for the retry,
 * stays real.
 *
 * What the grid shows is written up in docs/audits/archive/untangle-decision-log.md, "Quality switch result".
 */
const library = vi.hoisted(() => ({
  mode: 'plain' as 'plain' | 'real browser' | 'all-throw',
  calls: 0,
  crashed: 0,
}));

vi.mock('edmonds-blossom', async (importOriginal) => {
  const real = await importOriginal<{
    default: (edges: number[][], maxCardinality?: boolean) => number[];
  }>();
  return {
    default: vi.fn((edges: number[][], maxCardinality?: boolean) => {
      if (library.mode === 'all-throw') throw new ReferenceError('b is not defined');
      if (library.mode === 'plain') return real.default(edges, maxCardinality);

      // Real browser: a strict-mode browser throws when the library assigns an undeclared
      // variable. Node does not, so look for the three names it leaks and throw for them.
      const leaks = globalThis as Record<string, unknown>;
      const clear = () => ['b', 'path', 'v'].forEach((name) => Reflect.deleteProperty(leaks, name));
      clear();
      const result = real.default(edges, maxCardinality);
      const leaked = ['b', 'path', 'v'].some((name) => name in leaks);
      clear();
      library.calls++;
      if (leaked) {
        library.crashed++;
        throw new ReferenceError('b is not defined');
      }
      return result;
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

/** One night of one block: how it ended, or the error it stopped with. */
type Night = { bends: number; placeable: boolean; unmatched: string[] } | { failed: unknown };
type SeededNight = { seed: number; off: Night; on: Night };

const runNight = async (
  block: ReturnType<typeof buildGridBlock>,
  config: typeof OFF | typeof ON
): Promise<Night> => {
  vi.mocked(fetchTeamsByIds).mockResolvedValue(block.rows);
  try {
    const result = await scheduleStandardPairings({ Early: block.teams }, config, []);
    const list = result.pairings.Early ?? [];
    return {
      bends: countRuleBends(list),
      placeable: splitsIntoTwoSlots(list),
      unmatched: result.unmatchedTeamIds,
    };
  } catch (failed) {
    return { failed };
  }
};

const isGood = (night: Night) => 'bends' in night && night.bends === 0 && night.placeable;
const count = (nights: SeededNight[], pick: (night: SeededNight) => boolean) =>
  nights.filter(pick).length;
const sum = (numbers: number[]) => numbers.reduce((total, next) => total + next, 0);

type Case = { mix: string; size: number; key: string };
const CASES: Case[] = Object.keys(GRID_MIXES).flatMap((mix) =>
  GRID_SIZES.map((size) => ({ mix, size, key: `${mix} ${size}` }))
);

/**
 * Cases where the old per-block gate, "ON bends no more rules than OFF", still fails. Both are
 * blocks of 6. They run with `it.fails`: green while the gap is there, red when it is fixed.
 * - 2/2/2 at 6 (2 Competitive, 2 Intermediate, 2 Recreational): a clean schedule EXISTS (round 1
 *   C1-C2, I1-R1, I2-R2; round 2 C1-I1, C2-I2, R1-R2). Neither setting finds it, so both bend
 *   and, block by block, the count goes both ways.
 * - 3/1/2 at 6 (3 Competitive, 1 Intermediate, 2 Recreational): NO clean schedule exists under
 *   the no-repeat rule. Both bend. OFF's lower bend count sits beside lists that Apply cannot
 *   place: in the plain library 19 of OFF's 40 lists cannot be placed (ON: 6).
 */
const BEND_GAPS = new Set(['2/2/2 6', '3/1/2 6']);

/**
 * Cases where ON does not find a clean, placeable list in every block. 2/2/2 at 6: a clean
 * schedule exists but neither setting finds it. 3/1/2 at 6 and at 8 (5 Competitive, 1
 * Intermediate, 2 Recreational): no clean schedule exists, so nothing can find one.
 */
const NO_CLEAN_FOUND = new Set(['2/2/2 6', '3/1/2 6', '3/1/2 8']);

const MODES = ['plain', 'real browser', 'all-throw'] as const;

describe.each(MODES)('Prioritize Match Quality grid, %s library', (mode) => {
  const nightsByCase = new Map<string, SeededNight[]>();

  beforeAll(async () => {
    library.mode = mode;
    library.calls = 0;
    library.crashed = 0;
    for (const { mix, size, key } of CASES) {
      const nights: SeededNight[] = [];
      for (let seed = 1; seed <= SEEDS; seed++) {
        const block = buildGridBlock(GRID_MIXES[mix], size, seed);
        nights.push({ seed, off: await runNight(block, OFF), on: await runNight(block, ON) });
      }
      nightsByCase.set(key, nights);
    }
  });

  it('uses the library the way the mode says', () => {
    if (mode === 'real browser') {
      // The emulation really fires on some calls, and lets the others through.
      expect(library.crashed).toBeGreaterThan(0);
      expect(library.crashed).toBeLessThan(library.calls);
    } else {
      expect(library.calls).toBe(0);
    }
  });

  it('never turns a good night of OFF into a bad one, in any case', () => {
    for (const { key } of CASES) {
      const regressions = (nightsByCase.get(key) ?? [])
        .filter(({ off, on }) => isGood(off) && !isGood(on))
        .map(({ seed }) => `${key} seed ${seed}`);

      expect(regressions).toEqual([]);
    }
  });

  it('finds at least as many good nights as OFF in every case, and more across the grid', () => {
    for (const { key } of CASES) {
      const nights = nightsByCase.get(key) ?? [];

      expect(count(nights, ({ on }) => isGood(on))).toBeGreaterThanOrEqual(
        count(nights, ({ off }) => isGood(off))
      );
    }
    const all = CASES.flatMap(({ key }) => nightsByCase.get(key) ?? []);
    expect(count(all, ({ on }) => isGood(on))).toBeGreaterThan(
      count(all, ({ off }) => isGood(off))
    );
  });

  describe.each(CASES)('tier mix $mix, $size teams', ({ key }) => {
    const nights = () => nightsByCase.get(key) ?? [];

    // Where a clean schedule can be found, ON finds one in every seeded block.
    const findsCleanEveryTime = NO_CLEAN_FOUND.has(key) ? it.fails : it;
    findsCleanEveryTime(`ON finds a clean list that Apply can place in all ${SEEDS} blocks`, () => {
      expect(count(nights(), ({ on }) => isGood(on))).toBe(SEEDS);
    });

    const bendsNoMore = BEND_GAPS.has(key) ? it.fails : it;
    bendsNoMore(`ON bends no more rules than OFF in any of ${SEEDS} blocks`, () => {
      const worse = nights()
        .filter(({ off, on }) => 'bends' in off && 'bends' in on && on.bends > off.bends)
        .map(({ seed }) => seed);

      expect(worse).toEqual([]);
    });

    it('stops no more nights than OFF does, and a night that finishes leaves no team short', () => {
      const stopped = (night: Night) => ('failed' in night ? 1 : 0);

      expect(sum(nights().map(({ on }) => stopped(on)))).toBeLessThanOrEqual(
        sum(nights().map(({ off }) => stopped(off)))
      );
      for (const { on } of nights()) {
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
