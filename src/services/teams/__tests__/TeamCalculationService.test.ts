import { describe, expect, it } from 'vitest';

import type { Team } from '@/types';

import { calculateTeamStats, formatTeamStats, getTeamRank } from '../TeamCalculationService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTeam = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'team-1',
    name: 'Eagles',
    wins: 4,
    losses: 2,
    game_wins: 9,
    game_losses: 5,
    power_score: 75.5,
    sos: 0.6,
    win_percentage: 0,
    game_win_percentage: 0,
    ...overrides,
  }) as Team;

// ─── calculateTeamStats ───────────────────────────────────────────────────────

describe('calculateTeamStats', () => {
  it('calculates win percentage correctly', () => {
    const stats = calculateTeamStats(makeTeam({ wins: 4, losses: 1 }));
    expect(stats.winPercentage).toBeCloseTo(0.8);
  });

  it('calculates game win percentage correctly', () => {
    const stats = calculateTeamStats(makeTeam({ game_wins: 9, game_losses: 3 }));
    expect(stats.gameWinPercentage).toBeCloseTo(0.75);
  });

  it('returns 0 for win % when no matches played', () => {
    const stats = calculateTeamStats(makeTeam({ wins: 0, losses: 0 }));
    expect(stats.winPercentage).toBe(0);
    expect(stats.totalMatches).toBe(0);
  });

  it('returns 0 for game win % when no games played', () => {
    const stats = calculateTeamStats(makeTeam({ game_wins: 0, game_losses: 0 }));
    expect(stats.gameWinPercentage).toBe(0);
  });

  it('passes through powerScore as-is (including null)', () => {
    expect(calculateTeamStats(makeTeam({ power_score: null })).powerScore).toBeNull();
    expect(calculateTeamStats(makeTeam({ power_score: 80 })).powerScore).toBe(80);
  });

  it('defaults sos to 0.5 when null', () => {
    expect(calculateTeamStats(makeTeam({ sos: null })).sos).toBe(0.5);
  });

  it('calculates totalMatches and totalGames', () => {
    const stats = calculateTeamStats(
      makeTeam({ wins: 3, losses: 2, game_wins: 7, game_losses: 4 })
    );
    expect(stats.totalMatches).toBe(5);
    expect(stats.totalGames).toBe(11);
  });
});

// ─── getTeamRank ──────────────────────────────────────────────────────────────

describe('getTeamRank', () => {
  it('returns 1 for the top team', () => {
    const teams = [makeTeam({ id: 'a', power_score: 90 }), makeTeam({ id: 'b', power_score: 70 })];
    expect(getTeamRank(teams, 'a')).toBe(1);
  });

  it('returns 2 for the second team', () => {
    const teams = [makeTeam({ id: 'a', power_score: 90 }), makeTeam({ id: 'b', power_score: 70 })];
    expect(getTeamRank(teams, 'b')).toBe(2);
  });

  it('places teams with null power_score at the end', () => {
    const teams = [
      makeTeam({ id: 'a', power_score: 80 }),
      makeTeam({ id: 'b', power_score: null }),
    ];
    expect(getTeamRank(teams, 'b')).toBe(2);
  });

  it('returns teams.length when team id not found', () => {
    const teams = [makeTeam({ id: 'a', power_score: 80 })];
    expect(getTeamRank(teams, 'not-found')).toBe(1);
  });
});

// ─── formatTeamStats ─────────────────────────────────────────────────────────

describe('formatTeamStats', () => {
  it('formats record as wins-losses string', () => {
    const result = formatTeamStats(makeTeam({ wins: 4, losses: 2 }));
    expect(result.record).toBe('4-2');
  });

  it('formats game record', () => {
    const result = formatTeamStats(makeTeam({ game_wins: 9, game_losses: 5 }));
    expect(result.gameRecord).toBe('9-5');
  });

  it('returns N/A for powerScore when null', () => {
    const result = formatTeamStats(makeTeam({ power_score: null }));
    expect(result.powerScore).toBe('N/A');
  });

  it('formats powerScore to one decimal when present', () => {
    const result = formatTeamStats(makeTeam({ power_score: 75.567 }));
    expect(result.powerScore).toBe('75.6');
  });

  it('formats winPercentage as percentage string', () => {
    const result = formatTeamStats(makeTeam({ wins: 3, losses: 1 }));
    expect(result.winPercentage).toBe('75.0');
  });
});
