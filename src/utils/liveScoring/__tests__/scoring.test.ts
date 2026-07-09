import { describe, expect, it } from 'vitest';

import { cancellationNet, foldGameTotals, isValidRoundScore, VALID_ROUND_SCORES } from '../scoring';

describe('isValidRoundScore', () => {
  it('accepts every reachable cornhole round score', () => {
    for (const score of VALID_ROUND_SCORES) {
      expect(isValidRoundScore(score)).toBe(true);
    }
  });

  it('rejects 11 (unreachable with 4 bags)', () => {
    expect(isValidRoundScore(11)).toBe(false);
  });

  it('rejects out-of-range and non-integer values', () => {
    expect(isValidRoundScore(-1)).toBe(false);
    expect(isValidRoundScore(13)).toBe(false);
    expect(isValidRoundScore(2.5)).toBe(false);
    expect(isValidRoundScore(NaN)).toBe(false);
    expect(isValidRoundScore(Infinity)).toBe(false);
  });
});

describe('cancellationNet', () => {
  it('awards the difference to team 1 when it outscores team 2', () => {
    expect(cancellationNet({ team1: 8, team2: 5 })).toEqual({ net: 3, winner: 1 });
  });

  it('awards the difference to team 2 when it outscores team 1', () => {
    expect(cancellationNet({ team1: 2, team2: 12 })).toEqual({ net: 10, winner: 2 });
  });

  it('is a wash when both teams score the same', () => {
    expect(cancellationNet({ team1: 6, team2: 6 })).toEqual({ net: 0, winner: null });
    expect(cancellationNet({ team1: 0, team2: 0 })).toEqual({ net: 0, winner: null });
  });
});

describe('foldGameTotals', () => {
  it('returns zeros for an empty round log', () => {
    expect(foldGameTotals([])).toEqual({ team1: 0, team2: 0 });
  });

  it('accumulates net points only for the round winner', () => {
    const rounds = [
      { team1: 8, team2: 5 }, // +3 team1
      { team1: 4, team2: 4 }, // wash
      { team1: 0, team2: 12 }, // +12 team2
      { team1: 7, team2: 6 }, // +1 team1
    ];
    expect(foldGameTotals(rounds)).toEqual({ team1: 4, team2: 12 });
  });

  it('never exceeds the winning margin (cancellation, not raw sums)', () => {
    const rounds = [
      { team1: 10, team2: 9 },
      { team1: 9, team2: 10 },
    ];
    expect(foldGameTotals(rounds)).toEqual({ team1: 1, team2: 1 });
  });
});
