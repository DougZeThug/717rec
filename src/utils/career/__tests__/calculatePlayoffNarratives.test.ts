import { describe, expect, it } from 'vitest';

import {
  calculatePlayoffConsistency,
  getPlayoffFinishLabel,
} from '../calculatePlayoffNarratives';
import type { SeasonStats } from '../types';

const season = (playoff_rank: number | null): SeasonStats => ({
  match_wins: null,
  match_losses: null,
  game_wins: null,
  game_losses: null,
  champion: null,
  runner_up: null,
  playoff_rank,
  sos: null,
  division_name: null,
});

describe('calculatePlayoffConsistency', () => {
  it('returns zeros for null input', () => {
    expect(calculatePlayoffConsistency(null)).toEqual({
      seasonsPlayed: 0,
      seasonsInPlayoffs: 0,
      playoffRate: 0,
    });
  });

  it('returns zeros for empty array', () => {
    expect(calculatePlayoffConsistency([])).toEqual({
      seasonsPlayed: 0,
      seasonsInPlayoffs: 0,
      playoffRate: 0,
    });
  });

  it('returns zero playoff rate when team never made playoffs', () => {
    const result = calculatePlayoffConsistency([season(null), season(null)]);
    expect(result).toEqual({ seasonsPlayed: 2, seasonsInPlayoffs: 0, playoffRate: 0 });
  });

  it('counts seasons with a playoff_rank as playoff appearances', () => {
    const result = calculatePlayoffConsistency([season(1), season(null), season(3)]);
    expect(result.seasonsPlayed).toBe(3);
    expect(result.seasonsInPlayoffs).toBe(2);
    expect(result.playoffRate).toBeCloseTo(66.67, 1);
  });

  it('returns 100% when team made playoffs every season', () => {
    const result = calculatePlayoffConsistency([season(1), season(2), season(4)]);
    expect(result).toEqual({ seasonsPlayed: 3, seasonsInPlayoffs: 3, playoffRate: 100 });
  });
});

describe('getPlayoffFinishLabel', () => {
  it('returns "Champion" for rank 1', () => {
    expect(getPlayoffFinishLabel(1)).toBe('Champion');
  });

  it('returns "Runner-up" for rank 2', () => {
    expect(getPlayoffFinishLabel(2)).toBe('Runner-up');
  });

  it('returns "Third Place" for rank 3', () => {
    expect(getPlayoffFinishLabel(3)).toBe('Third Place');
  });

  it('returns "#N" for other ranks', () => {
    expect(getPlayoffFinishLabel(4)).toBe('#4');
    expect(getPlayoffFinishLabel(8)).toBe('#8');
  });
});
