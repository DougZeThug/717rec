import { afterEach, describe, expect, it, vi } from 'vitest';

import { transformBracket, transformGames, transformMatches } from '../MatchTransformer';

afterEach(() => vi.resetAllMocks());

const match = (overrides = {}) =>
  ({
    id: 'm1',
    round: 1,
    position: 1,
    team1Id: 'a',
    team2Id: 'b',
    winnerId: 'a',
    loserId: 'b',
    team1Score: 2,
    team2Score: 1,
    matchType: 'winners',
    bestOf: 3,
    bracket_id: 'bracket',
    status: 'completed',
    team1Seed: 1,
    team2Seed: 2,
    games: [{ id: 'g1', team1Score: 10, team2Score: 5, winnerId: 'a' }],
    ...overrides,
  }) as never;

describe('MatchTransformer', () => {
  it('builds single and double elimination stages', () => {
    expect(
      transformBracket({ id: 'b', format: 'Single Elimination', state: 'pending' })
    ).toMatchObject({
      name: 'Playoff Bracket',
      type: 'single_elimination',
      settings: { size: 8 },
    });
    expect(
      transformBracket({
        id: 'b',
        name: 'Cup',
        format: 'Double Elimination',
        state: 'pending',
        participants: Object.assign([], { grandFinalType: 'double' }),
      })
    ).toMatchObject({
      name: 'Cup',
      type: 'double_elimination',
      settings: { grandFinal: 'double' },
    });
  });

  it('sorts bracket groups, wires ids, seeds, scores, and results', () => {
    const forward = new Map<string, number>();
    const reverse = new Map<number, string>();
    const result = transformMatches(
      [
        match({ id: 'l1', matchType: 'losers', position: 1 }),
        match(),
        match({ id: 'f1', matchType: 'finals', position: 1 }),
      ],
      forward,
      reverse,
      new Map([
        ['a', 7],
        ['b', 8],
      ])
    );
    expect(result.map(({ group_id }) => group_id)).toEqual([1, 2, 3]);
    expect(result[0]).toMatchObject({
      id: 1,
      opponent1: { id: 7, position: 1, result: 'win', score: 2 },
      opponent2: { id: 8, result: 'loss' },
      status: 'completed',
    });
    expect(forward.get('l1')).toBe(2);
    expect(reverse.get(3)).toBe('f1');
  });

  it("orders several matches of one type by round, then position (today's behaviour)", () => {
    const forward = new Map<string, number>();
    const reverse = new Map<number, string>();
    // Each type is fed out of order: round 2 first, then position 2, then position 1.
    const result = transformMatches(
      [
        match({ id: 'w-r2p1', matchType: 'winners', round: 2, position: 1 }),
        match({ id: 'l-r2p1', matchType: 'losers', round: 2, position: 1 }),
        match({ id: 'f-r2p1', matchType: 'finals', round: 2, position: 1 }),
        match({ id: 'w-r1p2', matchType: 'winners', round: 1, position: 2 }),
        match({ id: 'l-r1p2', matchType: 'losers', round: 1, position: 2 }),
        match({ id: 'f-r1p2', matchType: 'finals', round: 1, position: 2 }),
        match({ id: 'w-r1p1', matchType: 'winners', round: 1, position: 1 }),
        match({ id: 'l-r1p1', matchType: 'losers', round: 1, position: 1 }),
        match({ id: 'f-r1p1', matchType: 'finals', round: 1, position: 1 }),
      ],
      forward,
      reverse,
      new Map([
        ['a', 7],
        ['b', 8],
      ])
    );

    // Viewer numbers run 1..9: winners first, then losers, then finals.
    expect(result.map(({ number }) => number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.map(({ group_id }) => group_id)).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);
    // Inside each group the order is round first, then position.
    expect([...reverse.entries()]).toEqual([
      [1, 'w-r1p1'],
      [2, 'w-r1p2'],
      [3, 'w-r2p1'],
      [4, 'l-r1p1'],
      [5, 'l-r1p2'],
      [6, 'l-r2p1'],
      [7, 'f-r1p1'],
      [8, 'f-r1p2'],
      [9, 'f-r2p1'],
    ]);
    expect(forward.get('w-r2p1')).toBe(3);
    expect(forward.get('l-r1p1')).toBe(4);
    expect(forward.get('f-r2p1')).toBe(9);
  });

  it('creates games and skips matches without a viewer id', () => {
    const result = transformGames(
      [match(), match({ id: 'missing' })],
      new Map([['m1', 4]]),
      new Map([
        ['a', 1],
        ['b', 2],
      ])
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 1,
        parent_id: 4,
        number: 1,
        status: 'completed',
        opponent1: { id: 1, score: 10, result: 'win' },
        opponent2: { id: 2, score: 5, result: 'loss' },
      }),
    ]);
  });
});
