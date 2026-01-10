import { describe, expect, it } from 'vitest';

import { calculateCareerSOS } from '../calculateCareerSOS';
import { SeasonStats } from '../types';

describe('calculateCareerSOS', () => {
  it('returns default 0.5 when no season stats', () => {
    expect(calculateCareerSOS(null)).toBe(0.5);
    expect(calculateCareerSOS([])).toBe(0.5);
  });

  it('returns default when all seasons have zero matches', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 0,
        match_losses: 0,
        game_wins: 0,
        game_losses: 0,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.6,
        division_name: null,
      },
    ];

    expect(calculateCareerSOS(seasonStats)).toBe(0.5);
  });

  it('returns default when SOS is null', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 5,
        match_losses: 3,
        game_wins: 10,
        game_losses: 6,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null,
        division_name: null,
      },
    ];

    expect(calculateCareerSOS(seasonStats)).toBe(0.5);
  });

  it('calculates simple average with equal matches', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 5,
        match_losses: 5,
        game_wins: 10,
        game_losses: 10,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.6,
        division_name: null,
      },
      {
        match_wins: 5,
        match_losses: 5,
        game_wins: 10,
        game_losses: 10,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.4,
        division_name: null,
      },
    ];

    // Both seasons have 10 matches, so average of 0.6 and 0.4 = 0.5
    expect(calculateCareerSOS(seasonStats)).toBe(0.5);
  });

  it('calculates weighted average with different match counts', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 8,
        match_losses: 2, // 10 matches
        game_wins: 0,
        game_losses: 0,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.7,
        division_name: null,
      },
      {
        match_wins: 2,
        match_losses: 3, // 5 matches
        game_wins: 0,
        game_losses: 0,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.4,
        division_name: null,
      },
    ];

    // Weighted: (0.7 * 10 + 0.4 * 5) / 15 = (7 + 2) / 15 = 0.6
    expect(calculateCareerSOS(seasonStats)).toBe(0.6);
  });

  it('ignores seasons with null SOS but includes valid ones', () => {
    const seasonStats: SeasonStats[] = [
      {
        match_wins: 5,
        match_losses: 5,
        game_wins: 0,
        game_losses: 0,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: 0.6,
        division_name: null,
      },
      {
        match_wins: 5,
        match_losses: 5,
        game_wins: 0,
        game_losses: 0,
        champion: null,
        runner_up: null,
        playoff_rank: null,
        sos: null, // This should be ignored
        division_name: null,
      },
    ];

    expect(calculateCareerSOS(seasonStats)).toBe(0.6);
  });
});
