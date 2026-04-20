import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { getTrendingTeams } from '../getTrendingTeams';

function makeTeam(id: string, power_score: number | null): Team {
  return {
    id,
    name: `Team ${id}`,
    power_score,
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    players: [],
    division_id: null,
    division: null,
    divisionName: null,
    logoUrl: null,
    imageUrl: null,
    sos: null,
    win_percentage: 0,
    game_win_percentage: 0,
    created_at: new Date().toISOString(),
    close_match_losses: null,
  } as Team;
}

describe('getTrendingTeams', () => {
  it('returns empty array for empty teams list', () => {
    expect(getTrendingTeams([])).toEqual([]);
  });

  it('returns empty array for null/undefined teams', () => {
    expect(getTrendingTeams(null as unknown as Team[])).toEqual([]);
  });

  it('filters out teams with no increase (no previousScores → increase = 0)', () => {
    const teams = [makeTeam('a', 60), makeTeam('b', 50)];
    // No previousScores: previousScore falls back to team.power_score, so increase = 0
    const result = getTrendingTeams(teams, {});
    expect(result).toHaveLength(0);
  });

  it('returns only teams with positive increase, sorted desc', () => {
    const teams = [makeTeam('a', 70), makeTeam('b', 60), makeTeam('c', 55)];
    const previousScores = { a: 65, b: 58, c: 60 }; // c decreased
    const result = getTrendingTeams(teams, previousScores);
    expect(result).toHaveLength(2);
    expect(result[0].team.id).toBe('a'); // increase 5
    expect(result[1].team.id).toBe('b'); // increase 2
  });

  it('excludes teams with negative increase', () => {
    const teams = [makeTeam('a', 40), makeTeam('b', 70)];
    const previousScores = { a: 50, b: 60 };
    const result = getTrendingTeams(teams, previousScores);
    expect(result).toHaveLength(1);
    expect(result[0].team.id).toBe('b');
  });

  it('uses team power_score as baseline when not in previousScores', () => {
    const teams = [makeTeam('a', 60)];
    // previousScore defaults to power_score (60), so increase = 0 → filtered
    const result = getTrendingTeams(teams);
    expect(result).toHaveLength(0);
  });

  it('returns increase values on result objects', () => {
    const teams = [makeTeam('a', 80)];
    const previousScores = { a: 70 };
    const result = getTrendingTeams(teams, previousScores);
    expect(result[0].increase).toBe(10);
    expect(result[0].team.id).toBe('a');
  });
});
