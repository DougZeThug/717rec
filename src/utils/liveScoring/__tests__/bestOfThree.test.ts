import { describe, expect, it } from 'vitest';

import { deriveMatchState, nextRoundNumber } from '../bestOfThree';
import type { GameSummary } from '../types';

const game = (
  gameNumber: number,
  status: GameSummary['status'],
  winnerSide: GameSummary['winnerSide']
): GameSummary => ({ gameNumber, status, winnerSide });

describe('deriveMatchState', () => {
  it('fresh match: game 1 is next', () => {
    expect(deriveMatchState([])).toEqual({
      gameWins: { team1: 0, team2: 0 },
      matchWinner: null,
      nextGameNumber: 1,
      isComplete: false,
    });
  });

  it('in-progress games do not count as wins', () => {
    const state = deriveMatchState([game(1, 'in_progress', null)]);
    expect(state.gameWins).toEqual({ team1: 0, team2: 0 });
    expect(state.isComplete).toBe(false);
  });

  it('2-0 sweep completes the match, no game 3', () => {
    const state = deriveMatchState([game(1, 'completed', 1), game(2, 'completed', 1)]);
    expect(state.matchWinner).toBe(1);
    expect(state.isComplete).toBe(true);
    expect(state.nextGameNumber).toBeNull();
  });

  it('1-1 split sends the match to game 3', () => {
    const state = deriveMatchState([game(1, 'completed', 1), game(2, 'completed', 2)]);
    expect(state.matchWinner).toBeNull();
    expect(state.nextGameNumber).toBe(3);
  });

  it('game 3 winner takes the match 2-1', () => {
    const state = deriveMatchState([
      game(1, 'completed', 2),
      game(2, 'completed', 1),
      game(3, 'completed', 2),
    ]);
    expect(state.gameWins).toEqual({ team1: 1, team2: 2 });
    expect(state.matchWinner).toBe(2);
    expect(state.nextGameNumber).toBeNull();
  });

  it('never proposes a game beyond best-of-3', () => {
    const state = deriveMatchState([
      game(1, 'completed', null),
      game(2, 'completed', null),
      game(3, 'completed', null),
    ]);
    expect(state.nextGameNumber).toBeNull();
    expect(state.isComplete).toBe(false);
  });
});

describe('nextRoundNumber', () => {
  it('starts at 1 for an empty log', () => {
    expect(nextRoundNumber([])).toBe(1);
  });

  it('is max + 1 even when the log is unsorted or has gaps', () => {
    expect(nextRoundNumber([{ roundNumber: 3 }, { roundNumber: 1 }])).toBe(4);
    expect(nextRoundNumber([{ roundNumber: 5 }])).toBe(6);
  });
});
