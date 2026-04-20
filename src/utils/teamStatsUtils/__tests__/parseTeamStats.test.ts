import { describe, expect, it } from 'vitest';

import { parseTeamStats } from '../parseTeamStats';

describe('parseTeamStats', () => {
  it('returns correct integers from a full team object', () => {
    const result = parseTeamStats({ wins: 5, losses: 3, game_wins: 12, game_losses: 8 });
    expect(result).toEqual({ wins: 5, losses: 3, gameWins: 12, gameLosses: 8 });
  });

  it('defaults missing fields to 0', () => {
    const result = parseTeamStats({});
    expect(result).toEqual({ wins: 0, losses: 0, gameWins: 0, gameLosses: 0 });
  });

  it('defaults null fields to 0', () => {
    const result = parseTeamStats({ wins: null, losses: null, game_wins: null, game_losses: null });
    expect(result).toEqual({ wins: 0, losses: 0, gameWins: 0, gameLosses: 0 });
  });

  it('coerces string numbers via parseInt', () => {
    const result = parseTeamStats({ wins: '3', losses: '1', game_wins: '7', game_losses: '4' });
    expect(result).toEqual({ wins: 3, losses: 1, gameWins: 7, gameLosses: 4 });
  });

  it('handles zero values correctly', () => {
    const result = parseTeamStats({ wins: 0, losses: 0, game_wins: 0, game_losses: 0 });
    expect(result).toEqual({ wins: 0, losses: 0, gameWins: 0, gameLosses: 0 });
  });
});
