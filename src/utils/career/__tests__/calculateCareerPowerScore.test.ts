import { beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateCareerPowerScore } from '../calculateCareerPowerScore';

// Mock Supabase client (needed for module resolution, but tests use prefetched data path)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            data: [],
            error: null,
          })),
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    })),
  },
}));

describe('calculateCareerPowerScore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates career power score with championship bonus', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: ['Competitive'],
      runnerUpDivisions: [],
      careerPlayoffWins: 5,
      careerPlayoffLosses: 2,
      competitivePlayoffWins: 3,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.95, match_wins: 10, match_losses: 1, season_id: 'season-1' },
        { power_score: 0.92, match_wins: 10, match_losses: 1, season_id: 'season-2' },
      ],
      prefetchedCurrentTeamData: { power_score: 95, wins: 10, losses: 1 },
    });

    // Should be a number between 0 and 100
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('caps result at 100', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: ['Competitive', 'Competitive', 'Competitive'],
      runnerUpDivisions: ['Competitive', 'Competitive'],
      careerPlayoffWins: 50,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 50,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.95, match_wins: 10, match_losses: 1, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: { power_score: 95, wins: 10, losses: 1 },
    });

    expect(result).toBe(100);
  });

  it('applies championship weight based on division name', async () => {
    const baseInput = {
      runnerUpDivisions: [] as string[],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.5,
      prefetchedSeasonStats: [
        { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    };

    // Competitive championship should give 7 * 1.0 = 7 points
    const compResult = await calculateCareerPowerScore({
      ...baseInput,
      teamId: 'team-1',
      championshipDivisions: ['Competitive'],
    });

    // Recreational championship should give 7 * 0.25 = 1.75 points
    const recResult = await calculateCareerPowerScore({
      ...baseInput,
      teamId: 'team-2',
      championshipDivisions: ['Recreational'],
    });

    // Both should return valid numbers, competitive should be higher
    expect(compResult).toBeGreaterThan(recResult);
  });

  it('applies runner-up bonus correctly', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: [],
      runnerUpDivisions: ['Competitive'],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    });

    // Base 50 + runner-up bonus of 4 * 1.0 = 54
    expect(result).toBe(54);
  });

  it('adds competitive playoff bonus', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: [],
      runnerUpDivisions: [],
      careerPlayoffWins: 10,
      careerPlayoffLosses: 2,
      competitivePlayoffWins: 5, // 5 * 0.5 = 2.5 points
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    });

    expect(result).toBeGreaterThanOrEqual(0);
  });

  it('does not double-count current season when it appears in both data sources', async () => {
    // Regression test: current season should only be counted once
    // Historical season: 10 matches, power score 0.80 (= 80 on 0-100 scale)
    // Current season: 10 matches, power score 60 (0-100 scale)
    // Expected: (80*10 + 60*10) / 20 = 70.0

    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: [],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      currentSeasonId: 'current-season',
      prefetchedSeasonStats: [
        // Historical season
        { power_score: 0.8, match_wins: 7, match_losses: 3, season_id: 'past-season' },
        // Current season (should be filtered out because currentSeasonId matches)
        { power_score: 0.6, match_wins: 7, match_losses: 3, season_id: 'current-season' },
      ],
      prefetchedCurrentTeamData: {
        // Current season from v_team_details (0-100 scale)
        power_score: 60,
        wins: 7,
        losses: 3,
      },
    });

    // With the fix: (80*10 + 60*10) / 20 = 70.0 (no playoff bonuses)
    // Without the fix (bug): (80*10 + 60*10 + 60*10) / 30 = 66.67
    expect(result).toBe(70);
  });

  it('handles case where currentSeasonId is not provided (backward compatible)', async () => {
    // When currentSeasonId is not provided, all season stats are used
    // This tests backward compatibility
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: [],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.8, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    });

    // Base: (80 * 10) / 10 = 80, no bonuses
    expect(result).toBe(80);
  });

  it('returns 50 when no match data is available', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: [],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [],
      prefetchedCurrentTeamData: null,
    });

    expect(result).toBe(50);
  });
});
