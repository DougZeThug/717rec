import { describe, expect, it } from 'vitest';

import type { Match } from '@/types';

import {
  buildOrderedMatchesForStreaks,
  type PlayoffMatchForOrdering,
} from '../buildOrderedMatchesForStreaks';
import { calculateStreak } from '../calculateStreak';

const regular = (id: string, winner: string, date: string): Match =>
  ({
    id,
    team1Id: 'team-1',
    team2Id: 'opponent',
    winnerId: winner,
    loserId: winner === 'team-1' ? 'opponent' : 'team-1',
    iscompleted: true,
    date,
  }) as Match;

const playoff = (
  id: string,
  winner: string,
  overrides: Partial<PlayoffMatchForOrdering> = {}
): PlayoffMatchForOrdering => ({
  id,
  team1Id: 'team-1',
  team2Id: 'opponent',
  winnerId: winner,
  loserId: winner === 'team-1' ? 'opponent' : 'team-1',
  team1GameWins: 2,
  team2GameWins: 1,
  round: 1,
  position: 1,
  recordedAt: '2026-08-01T00:00:00.000Z',
  ...overrides,
});

describe('buildOrderedMatchesForStreaks', () => {
  it('assigns a strictly increasing orderKey across the whole list', () => {
    const result = buildOrderedMatchesForStreaks(
      [regular('r2', 'team-1', '2026-02-01'), regular('r1', 'team-1', '2026-01-01')],
      [playoff('p1', 'team-1')]
    );

    expect(result.map((m) => m.orderKey)).toEqual([0, 1, 2]);
    expect(result.map((m) => m.id)).toEqual(['r1', 'r2', 'p1']);
  });

  it('places every playoff match after every regular-season match', () => {
    // The regular-season date is far in the future; ordering must not depend on it.
    const result = buildOrderedMatchesForStreaks(
      [regular('r1', 'team-1', '2099-01-01')],
      [playoff('p1', 'team-1', { recordedAt: '2020-01-01T00:00:00.000Z' })]
    );

    expect(result.map((m) => m.id)).toEqual(['r1', 'p1']);
  });

  it('breaks identical recorded timestamps by round then position', () => {
    const sameInstant = '2026-08-01T00:00:00.000Z';
    const result = buildOrderedMatchesForStreaks(
      [],
      [
        playoff('later-round', 'team-1', { round: 3, position: 1, recordedAt: sameInstant }),
        playoff('same-round-later', 'team-1', { round: 2, position: 5, recordedAt: sameInstant }),
        playoff('earliest', 'team-1', { round: 2, position: 1, recordedAt: sameInstant }),
      ]
    );

    expect(result.map((m) => m.id)).toEqual(['earliest', 'same-round-later', 'later-round']);
  });

  it('orders by recorded time ahead of round, so losers-bracket games slot in correctly', () => {
    const result = buildOrderedMatchesForStreaks(
      [],
      [
        playoff('winners-r2', 'team-1', { round: 2, recordedAt: '2026-08-05T00:00:00.000Z' }),
        playoff('losers-r1', 'team-1', { round: 1, recordedAt: '2026-08-03T00:00:00.000Z' }),
      ]
    );

    expect(result.map((m) => m.id)).toEqual(['losers-r1', 'winners-r2']);
  });

  it('sorts undated regular matches first rather than dropping them', () => {
    const undated = { ...regular('r0', 'team-1', ''), date: undefined } as Match;
    const result = buildOrderedMatchesForStreaks(
      [regular('r1', 'team-1', '2026-01-01'), undated],
      []
    );

    expect(result.map((m) => m.id)).toEqual(['r0', 'r1']);
  });

  it('lets a playoff loss end a regular-season win streak', () => {
    const matches = buildOrderedMatchesForStreaks(
      [
        regular('r1', 'team-1', '2026-01-01'),
        regular('r2', 'team-1', '2026-01-08'),
        regular('r3', 'team-1', '2026-01-15'),
      ],
      [playoff('final', 'opponent', { team1GameWins: 1, team2GameWins: 2 })]
    );

    expect(calculateStreak('team-1', matches)).toBe('L1');
  });

  it('lets a playoff win extend a regular-season win streak', () => {
    const matches = buildOrderedMatchesForStreaks(
      [regular('r1', 'team-1', '2026-01-01'), regular('r2', 'team-1', '2026-01-08')],
      [playoff('final', 'team-1')]
    );

    expect(calculateStreak('team-1', matches)).toBe('W3');
  });
});
