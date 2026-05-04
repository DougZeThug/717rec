import { describe, expect, it } from 'vitest';

import { parseTeamStats } from '../parseTeamStats';

describe('parseTeamStats', () => {
  it.each([
    {
      label: 'full numeric object',
      input: { wins: 5, losses: 3, game_wins: 12, game_losses: 8 },
      expected: { wins: 5, losses: 3, gameWins: 12, gameLosses: 8 },
    },
    {
      label: 'missing optional fields',
      input: {},
      expected: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    },
    {
      label: 'null values',
      input: { wins: null, losses: null, game_wins: null, game_losses: null },
      expected: { wins: 0, losses: 0, gameWins: 0, gameLosses: 0 },
    },
    {
      label: 'string values and normalization',
      input: { wins: '3', losses: '1', game_wins: '7', game_losses: '4' },
      expected: { wins: 3, losses: 1, gameWins: 7, gameLosses: 4 },
    },
    {
      label: 'mixed decimals and text',
      input: { wins: '9.9', losses: '2games', game_wins: '11.4', game_losses: '8xyz' },
      expected: { wins: 9, losses: 2, gameWins: 11, gameLosses: 8 },
    },
    {
      label: 'invalid IDs and values become NaN',
      input: { wins: 'team-a', losses: 'N/A', game_wins: '-', game_losses: '---' },
      expected: {
        wins: Number.NaN,
        losses: Number.NaN,
        gameWins: Number.NaN,
        gameLosses: Number.NaN,
      },
    },
  ])('parses stats for $label', ({ input, expected }) => {
    const result = parseTeamStats(input);

    expect(Number.isNaN(result.wins)).toBe(Number.isNaN(expected.wins));
    expect(Number.isNaN(result.losses)).toBe(Number.isNaN(expected.losses));
    expect(Number.isNaN(result.gameWins)).toBe(Number.isNaN(expected.gameWins));
    expect(Number.isNaN(result.gameLosses)).toBe(Number.isNaN(expected.gameLosses));

    if (!Number.isNaN(expected.wins)) {
      expect(result).toEqual(expected);
    }
  });
});
