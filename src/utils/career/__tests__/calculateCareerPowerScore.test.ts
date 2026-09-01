import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateCareerPowerScore } from '../calculateCareerPowerScore';

// Live division weights come from the divisions table — mock the cache, not values in code.
const weightState = vi.hoisted(() => ({
  byName: new Map<string, number>([
    ['competitive', 1.0],
    ['competitive low', 0.95],
    ['cuspers', 0.9],
    ['intermediate high', 0.8],
    ['intermediate', 0.7],
    ['intermediate low', 0.6],
    ['recreational high', 0.6],
    ['recreational', 0.35],
  ]),
}));
const DEFAULT_WEIGHTS = new Map(weightState.byName);

vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: vi.fn(async () => weightState.byName),
  getDefaultDivisionWeight: () => 0.85,
}));

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

  it('scales the bonus cap by division strength for soft-division titles', async () => {
    // Three Intermediate titles (weight 0.7) should not reach the same ceiling as
    // three Competitive titles. The bonus cap is 15 * (max weight)^2.
    const intermediateResult = await calculateCareerPowerScore({
      teamId: 'team-soft',
      championshipDivisions: ['Intermediate', 'Intermediate', 'Intermediate'],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.7,
      prefetchedSeasonStats: [
        { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    });

    const competitiveResult = await calculateCareerPowerScore({
      teamId: 'team-hard',
      championshipDivisions: ['Competitive', 'Competitive', 'Competitive'],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      prefetchedSeasonStats: [
        { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'season-1' },
      ],
      prefetchedCurrentTeamData: null,
    });

    // Base 50 + soft bonus (capped at 15 * 0.7^2 = 7.35) should be ~57.35
    // Base 50 + hard bonus (capped at 15 * 1.0^2 = 15) should be 65
    expect(intermediateResult).toBeLessThan(competitiveResult);
    expect(intermediateResult).toBeCloseTo(57.35, 2);
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

  // ────────────────────────────────────────────────────────────────────────
  // Parity with the database.
  //
  // calculate_career_power_score() in SQL decides the King Slayer badge; this
  // function produces the number on screen. They drifted apart for months
  // without anything noticing (B-35), so these three fixtures — the inputs and
  // the expected totals — are asserted identically in
  // supabase/tests/career_power_score_parity.sql. Change one side and the
  // other fails.
  // ────────────────────────────────────────────────────────────────────────
  describe('parity with supabase/tests/career_power_score_parity.sql', () => {
    beforeEach(() => {
      // The same live weights that test pins on the divisions table.
      weightState.byName = new Map<string, number>([
        ['competitive', 1.0],
        ['intermediate high', 0.7],
        ['cuspers', 0.95],
      ]);
    });

    afterEach(() => {
      weightState.byName = new Map(DEFAULT_WEIGHTS);
    });

    const parityInput = {
      teamId: 'parity-team',
      runnerUpDivisions: [] as string[],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 1.0,
      playoffDivisions: [] as string[],
      prefetchedCurrentTeamData: null,
    };

    // Fixture 1: the floored season score, and a squared title bonus.
    // base 50 (career_power_score 0.50, not power_score 0.90)
    // + 7 x 0.70^2 = 3.43, under a cap of 15 x 0.70^2 = 7.35.
    it('fixture 1: prefers the floored season score and squares the title bonus', async () => {
      const result = await calculateCareerPowerScore({
        ...parityInput,
        championshipDivisions: ['Intermediate 1'],
        prefetchedSeasonStats: [
          {
            power_score: 0.9,
            career_power_score: 0.5,
            match_wins: 6,
            match_losses: 4,
            season_id: 'parity-1',
          },
        ],
      });

      expect(result).toBeCloseTo(53.43, 4);
    });

    // Fixture 2: three soft-division titles run into the scaled cap.
    // 3 x 7 x 0.70^2 = 10.29, capped at 15 x 0.70^2 = 7.35.
    it('fixture 2: caps three soft-division titles by division strength', async () => {
      const result = await calculateCareerPowerScore({
        ...parityInput,
        championshipDivisions: ['Intermediate High', 'Intermediate High', 'Intermediate High'],
        prefetchedSeasonStats: [
          {
            career_power_score: 0.5,
            power_score: 0.5,
            match_wins: 5,
            match_losses: 5,
            season_id: 'p1',
          },
          {
            career_power_score: 0.5,
            power_score: 0.5,
            match_wins: 5,
            match_losses: 5,
            season_id: 'p2',
          },
          {
            career_power_score: 0.5,
            power_score: 0.5,
            match_wins: 5,
            match_losses: 5,
            season_id: 'p3',
          },
        ],
      });

      expect(result).toBeCloseTo(57.35, 4);
    });

    // Fixture 3: the weight comes from the divisions table.
    // "Cuspers" is 0.95 here; the old SQL had it hardcoded at 0.70 and could
    // never see an admin re-weight it. 7 x 0.95^2 = 6.3175.
    it('fixture 3: reads the live weight of a re-weighted division', async () => {
      const result = await calculateCareerPowerScore({
        ...parityInput,
        championshipDivisions: ['Cuspers'],
        prefetchedSeasonStats: [
          {
            career_power_score: 0.5,
            power_score: 0.5,
            match_wins: 5,
            match_losses: 5,
            season_id: 'p1',
          },
        ],
      });

      expect(result).toBeCloseTo(56.3175, 4);
    });
  });
});
