import { describe, expect, it, vi } from 'vitest';

import type { TeamPairing } from '@/types/autoSchedule';
import { errorLog, warnLog } from '@/utils/logger';
import { createMockTeam } from '@/utils/test/autoSchedule/testHelpers';

import type { TeamPairingConfig } from '../types';
import { validatePairings, validatePairingsWithDetails } from '../validation';

vi.mock('@/utils/logger', () => ({
  debugLog: vi.fn(),
  errorLog: vi.fn(),
  scheduleLog: vi.fn(),
  warnLog: vi.fn(),
}));

const alpha = createMockTeam({ id: 'a', name: 'Alpha', divisionName: 'Recreational' });
const bravo = createMockTeam({ id: 'b', name: 'Bravo', divisionName: 'Competitive' });
const charlie = createMockTeam({ id: 'c', name: 'Charlie', divisionName: 'Intermediate' });
const delta = createMockTeam({ id: 'd', name: 'Delta', divisionName: 'Competitive' });

const pair = (first: typeof alpha, second: typeof alpha): TeamPairing => ({
  team1: first,
  team2: second,
  compatibilityScore: 5,
  hasPlayedBefore: false,
});

const config = (playedPairs: string[] = []): TeamPairingConfig => ({
  avoidRematches: true,
  getCompatibilityScoreFn: vi.fn(() => 10),
  playedPairsSet: new Set(playedPairs),
});

const fourTeams = [alpha, bravo, charlie, delta];

// Every team has 2 matches, and no pair repeats: a block that is fine.
const validList = [
  pair(alpha, bravo),
  pair(charlie, delta),
  pair(alpha, charlie),
  pair(bravo, delta),
];

// Every team has 2 matches, but Alpha-Bravo and Charlie-Delta are each listed twice.
const twoDuplicatePairs = [
  pair(alpha, bravo),
  pair(alpha, bravo),
  pair(charlie, delta),
  pair(charlie, delta),
];

describe('validatePairings', () => {
  it('accepts a list where every team has 2 matches and no pair repeats', () => {
    expect(validatePairings(fourTeams, validList, 2)).toBeUndefined();
  });

  it('throws when the same pair is listed twice, even if every team has 2 matches', () => {
    expect(() => validatePairings(fourTeams, twoDuplicatePairs, 2)).toThrowError(
      new Error('Session rematches detected: Alpha vs Bravo (2 times), Charlie vs Delta (2 times)')
    );
  });

  it('names the pair in the order of the repeated entry, even when the teams are swapped', () => {
    const swapped = [pair(alpha, bravo), pair(bravo, alpha)];

    expect(() => validatePairings([alpha, bravo], swapped, 2)).toThrowError(
      new Error('Session rematches detected: Bravo vs Alpha (2 times)')
    );
  });

  it('counts a pair that is listed three times as (2 times) and then (3 times)', () => {
    const threeCopies = [pair(alpha, bravo), pair(alpha, bravo), pair(alpha, bravo)];

    expect(() => validatePairings([alpha, bravo], threeCopies, 3)).toThrowError(
      new Error('Session rematches detected: Alpha vs Bravo (2 times), Alpha vs Bravo (3 times)')
    );
  });

  it('throws the match-count error first, and logs which teams are short', () => {
    // A triangle of Alpha, Bravo and Charlie. Delta plays nobody.
    const triangle = [pair(alpha, bravo), pair(bravo, charlie), pair(charlie, alpha)];

    expect(() => validatePairings(fourTeams, triangle, 2)).toThrowError(
      new Error("1 teams don't have 2 matches")
    );
    expect(warnLog).toHaveBeenCalledWith('Teams with incorrect match counts:', [
      'Delta: 0 matches',
    ]);
  });
});

describe('validatePairingsWithDetails', () => {
  it('accepts a list where every team has 2 matches and no pair repeats', () => {
    expect(validatePairingsWithDetails(fourTeams, validList, 2, config())).toBeUndefined();
  });

  it('throws when the same pair is listed twice, even if every team has 2 matches', () => {
    expect(() =>
      validatePairingsWithDetails(fourTeams, twoDuplicatePairs, 2, config())
    ).toThrowError(
      new Error('Session rematches detected: Alpha vs Bravo (2 times), Charlie vs Delta (2 times)')
    );
  });

  it('counts a pair that is listed three times as (2 times) and then (3 times)', () => {
    const threeCopies = [pair(alpha, bravo), pair(alpha, bravo), pair(alpha, bravo)];

    expect(() =>
      validatePairingsWithDetails([alpha, bravo], threeCopies, 3, config())
    ).toThrowError(
      new Error('Session rematches detected: Alpha vs Bravo (2 times), Alpha vs Bravo (3 times)')
    );
  });

  it('explains a short team: one opponent blocked by tier, one by a rematch, one available', () => {
    // Delta (Competitive) plays nobody. Alpha is Recreational (blocked by tier), Bravo is
    // Competitive and has played Delta (blocked by rematch), Charlie is Intermediate (free).
    const triangle = [pair(alpha, bravo), pair(bravo, charlie), pair(charlie, alpha)];

    expect(() => validatePairingsWithDetails(fourTeams, triangle, 2, config(['b-d']))).toThrowError(
      new Error(
        "1 teams don't have 2 matches. Details: Delta (T1): 0/2 matches. Available opponents: 1, blocked by tier: 1, blocked by rematch: 1"
      )
    );
    expect(errorLog).toHaveBeenCalledWith('VALIDATION FAILED - Detailed team analysis:');
    expect(errorLog).toHaveBeenCalledWith(
      '  Delta (T1): 0/2 matches. Available opponents: 1, blocked by tier: 1, blocked by rematch: 1'
    );
  });

  it('does not count a rematch between two Recreational teams as blocked', () => {
    const echo = createMockTeam({ id: 'e', name: 'Echo', divisionName: 'Recreational' });
    const foxtrot = createMockTeam({ id: 'f', name: 'Foxtrot', divisionName: 'Recreational' });
    // Charlie, Bravo and Delta (Intermediate or Competitive) form a triangle. Echo and Foxtrot,
    // both Recreational, have played each other and play nobody this time.
    const triangle = [pair(bravo, charlie), pair(charlie, delta), pair(delta, bravo)];

    expect(() =>
      validatePairingsWithDetails(
        [bravo, charlie, delta, echo, foxtrot],
        triangle,
        2,
        config(['e-f'])
      )
    ).toThrowError(
      new Error(
        "2 teams don't have 2 matches. Details: Echo (T3): 0/2 matches. Available opponents: 2, blocked by tier: 2, blocked by rematch: 0; Foxtrot (T3): 0/2 matches. Available opponents: 2, blocked by tier: 2, blocked by rematch: 0"
      )
    );
  });

  it('lists only the first 3 short teams and ends with ... when more are short', () => {
    const intermediate = ['a', 'b', 'c', 'd'].map((id) =>
      createMockTeam({ id, name: id.toUpperCase(), divisionName: 'Intermediate' })
    );
    const detail = (name: string) =>
      `${name} (T2): 0/2 matches. Available opponents: 3, blocked by tier: 0, blocked by rematch: 0`;

    expect(() => validatePairingsWithDetails(intermediate, [], 2, config())).toThrowError(
      new Error(
        `4 teams don't have 2 matches. Details: ${detail('A')}; ${detail('B')}; ${detail('C')}...`
      )
    );
  });
});
