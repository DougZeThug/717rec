import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AutoScheduleMatch, TeamPairing } from '@/types/autoSchedule';
import { splitsIntoTwoSlots } from '@/utils/autoSchedule/blossom/validation';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import { usePairingOperations } from '../usePairingOperations';

/**
 * The generator replaces a list only when `splitsIntoTwoSlots` says Apply cannot split it. A
 * false "no" would replace a list that works today. So this test feeds 300 fixed, pseudo-random
 * pairing lists (6 and 8 teams) to the REAL `handleApplySchedule` and checks the helper agrees
 * with it on every list: the helper says "splits" exactly when Apply books no team twice in
 * one time slot.
 *
 * Only the network, the toast, the saved-state storage and the logger are faked.
 */

vi.mock('../storage', () => ({
  loadAutoScheduleState: () => null,
  saveAutoScheduleState: vi.fn(),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/services/matches/SchedulingHistoryService', () => ({
  fetchSeasonHistoryForTeams: vi.fn(() => Promise.resolve([])),
  haveTeamsPlayedBefore: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@/utils/logger', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>();
  return {
    ...actual,
    log: vi.fn(),
    errorLog: vi.fn(),
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    scheduleLog: vi.fn(),
  };
});

const night = new Date(2026, 10, 19, 12);
const LIST_COUNT = 300;
const allIds = Array.from({ length: 8 }, (_, index) => `A${index + 1}`);

type Pair = [string, string];

/** A small fixed-seed generator (LCG): the same 300 lists on every run. */
const makeRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return (limit: number) => Math.floor(next() * limit);
};
type Random = ReturnType<typeof makeRandom>;

const shuffle = <T>(items: T[], random: Random): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = random(index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const sameTeams = (first: Pair, second: Pair) =>
  [...first].sort().join('-') === [...second].sort().join('-');

/** Every team paired once, in random pairs. */
const matching = (ids: string[], random: Random): Pair[] => {
  const mixed = shuffle(ids, random);
  const pairs: Pair[] = [];
  for (let index = 0; index < mixed.length; index += 2) {
    pairs.push([mixed[index], mixed[index + 1]]);
  }
  return pairs;
};

/** A second matching that shares no pair with the first (the first few tries may clash). */
const disjointMatching = (ids: string[], first: Pair[], random: Random): Pair[] => {
  let second = matching(ids, random);
  for (let attempt = 0; attempt < 50; attempt++) {
    if (!second.some((pair) => first.some((other) => sameTeams(pair, other)))) break;
    second = matching(ids, random);
  }
  return second;
};

/** Teams joined in a ring: the pairs are the ring's edges. */
const cycle = (ids: string[]): Pair[] =>
  ids.map((id, index): Pair => [id, ids[(index + 1) % ids.length]]);

/** The kinds of list the generator can return, plus broken ones. Index picks the kind. */
const buildList = (ids: string[], kind: number, random: Random): Pair[] => {
  const first = matching(ids, random);
  const second = disjointMatching(ids, first, random);
  const twoRounds = [...first, ...second];

  switch (kind) {
    case 0: // a valid list: round 1 then round 2
      return twoRounds;
    case 1: // the same pairs in a random order (some still split, some do not)
      return shuffle(twoRounds, random);
    case 2: // one ring through every team, edges in random order
      return shuffle(cycle(shuffle(ids, random)), random);
    case 3: {
      // two rings: a triangle and the rest (two triangles for 6 teams)
      const mixed = shuffle(ids, random);
      return shuffle([...cycle(mixed.slice(0, 3)), ...cycle(mixed.slice(3))], random);
    }
    case 4: {
      // a valid list where some pairs are copies of other pairs
      const copies = [...twoRounds];
      const copyCount = 1 + random(2);
      for (let count = 0; count < copyCount; count++) {
        copies[random(copies.length)] = copies[random(copies.length)];
      }
      return shuffle(copies, random);
    }
    case 5: // a partial list: some pairs are missing
      return shuffle(twoRounds, random).slice(0, 1 + random(twoRounds.length - 1));
    case 6: {
      // 2 or 3 pairs for each team (two or three rounds), in round order or shuffled
      const rounds = random(2) === 0 ? 2 : 3;
      const list = [...twoRounds];
      if (rounds === 3) list.push(...disjointMatching(ids, second, random));
      return random(2) === 0 ? list : shuffle(list, random);
    }
    default: {
      // random pairs of two different teams
      const count = 2 + random(2 * ids.length - 1);
      return Array.from({ length: count }, (): Pair => {
        const mixed = shuffle(ids, random);
        return [mixed[0], mixed[1]];
      });
    }
  }
};

/** True when some team is in two of the matches at the same time slot. */
const hasClash = (matches: AutoScheduleMatch[]) => {
  const booked = new Set<string>();
  return matches.some((match) =>
    [match.team1Id, match.team2Id].some((teamId) => {
      const key = `${match.timeslot}|${teamId}`;
      const already = booked.has(key);
      booked.add(key);
      return already;
    })
  );
};

describe('splitsIntoTwoSlots and the real Apply', () => {
  it('agree on 300 fixed pseudo-random lists for 6 and 8 teams', () => {
    const { result } = renderHook(() => usePairingOperations(vi.fn()));
    const random = makeRandom(717);
    const toPairing = ([first, second]: Pair): TeamPairing => ({
      team1: createMockTeam({ id: first, name: first }),
      team2: createMockTeam({ id: second, name: second }),
      compatibilityScore: 5,
      hasPlayedBefore: false,
    });

    const disagreements: string[] = [];
    let clashes = 0;
    for (let index = 0; index < LIST_COUNT; index++) {
      const ids = allIds.slice(0, Math.floor(index / 8) % 2 === 0 ? 6 : 8);
      const pairs = buildList(ids, index % 8, random);
      const pairings = pairs.map(toPairing);

      const matches = result.current.handleApplySchedule(
        { Early: pairings },
        night,
        false,
        vi.fn(),
        vi.fn()
      );
      const clash = matches === null ? null : hasClash(matches);
      if (clash) clashes++;
      if (clash === null || splitsIntoTwoSlots(pairings) === clash) {
        disagreements.push(`list ${index}: ${pairs.map((pair) => pair.join('-')).join(' ')}`);
      }
    }

    expect(disagreements).toEqual([]);
    // The check is not empty: both answers happen many times.
    expect(clashes).toBeGreaterThan(50);
    expect(LIST_COUNT - clashes).toBeGreaterThan(50);
  });
});
