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
  fetchDivisionWeightsByName: vi.fn(() => Promise.resolve(weightState.byName)),
  getDefaultDivisionWeight: () => 0.85,
}));

// The database path (no prefetched data) goes through CareerQueryService.
const careerQuery = vi.hoisted(() => ({
  fetchTeamSeasonPowerScores: vi.fn(),
  fetchCurrentTeamPower: vi.fn(),
  fetchActiveSeasonId: vi.fn(),
}));

vi.mock('@/services/career/CareerQueryService', () => ({
  CareerQueryService: careerQuery,
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

  it('returns 0 when the team has played nothing', async () => {
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

    // A team that has never played sits at the foot of the career table. It
    // used to be given 50, which put it mid-table above teams with a real
    // losing record.
    expect(result).toBe(0);
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

    // Fixture 4: no matches at all.
    // base 0, no bonuses to add — the foot of the career table.
    it('fixture 4: scores a team that has played nothing as 0', async () => {
      const result = await calculateCareerPowerScore({
        ...parityInput,
        championshipDivisions: [],
        prefetchedSeasonStats: [],
      });

      expect(result).toBe(0);
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

// Exact-value tests that pin every bonus and cap path. A refactor must not move them.
describe('calculateCareerPowerScore bonus and cap details', () => {
  // One past season at 0.5 over 10 matches gives a base score of exactly 50.
  const baseSeason = { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 's1' };
  const baseInput = {
    teamId: 'team-1',
    championshipDivisions: [] as string[],
    runnerUpDivisions: [] as string[],
    careerPlayoffWins: 0,
    careerPlayoffLosses: 0,
    competitivePlayoffWins: 0,
    teamDivisionWeight: 1.0,
    prefetchedSeasonStats: [baseSeason],
    prefetchedCurrentTeamData: null,
  };

  describe('playoff win-rate bonus', () => {
    it('pays (win rate - 0.5) * 4 * team division weight above a 50% win rate', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        careerPlayoffWins: 7,
        careerPlayoffLosses: 3,
      });

      // (0.7 - 0.5) * 4 * 1.0 = 0.8, under the cap of 15
      expect(result).toBeCloseTo(50.8, 10);
    });

    it.each([
      ['an even playoff record', 5, 5],
      ['a losing playoff record', 3, 7],
      ['no playoff matches', 0, 0],
    ])('pays nothing for %s', async (_label, wins, losses) => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        careerPlayoffWins: wins,
        careerPlayoffLosses: losses,
      });

      expect(result).toBe(50);
    });

    it('rates the run by the average live weight of playoffDivisions, not the team division', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        teamDivisionWeight: 0.5,
        careerPlayoffWins: 10,
        careerPlayoffLosses: 0,
        playoffDivisions: ['Recreational', 'Competitive'],
      });

      // average weight (0.35 + 1.0) / 2 = 0.675; bonus (1 - 0.5) * 4 * 0.675 = 1.35
      expect(result).toBeCloseTo(51.35, 10);
    });
  });

  it('adds 0.5 per competitive playoff win', async () => {
    const result = await calculateCareerPowerScore({ ...baseInput, competitivePlayoffWins: 5 });

    expect(result).toBe(52.5);
  });

  describe('bonus cap', () => {
    it('is scaled by playoffDivisions when nothing else qualifies', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        competitivePlayoffWins: 100, // 50 points, far above any cap
        playoffDivisions: ['Intermediate'],
      });

      // cap = 15 * 0.7^2 = 7.35
      expect(result).toBeCloseTo(57.35, 10);
    });

    it('uses the strongest division across titles, runner-ups and playoff runs', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        championshipDivisions: ['Recreational'],
        runnerUpDivisions: ['Competitive'],
        competitivePlayoffWins: 100,
      });

      // title 7 * 0.35^2 = 0.8575, runner-up 4 * 1.0^2, 50 playoff points: all above the cap.
      // cap = 15 * 1.0^2 = 15 (the runner-up division sets it)
      expect(result).toBeCloseTo(65, 10);
    });

    it('falls back to the team division weight when no bonus division exists', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        teamDivisionWeight: 0.7,
        competitivePlayoffWins: 100,
      });

      // cap = 15 * 0.7^2 = 7.35
      expect(result).toBeCloseTo(57.35, 10);
    });

    it('still caps the final score at 100', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        championshipDivisions: ['Competitive'],
        prefetchedSeasonStats: [{ ...baseSeason, power_score: 0.98 }],
      });

      // 98 + min(15, 7) = 105, capped at 100
      expect(result).toBe(100);
    });
  });

  describe('base score', () => {
    it('prefers the current row career_power_score over power_score', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedSeasonStats: [],
        prefetchedCurrentTeamData: { power_score: 60, career_power_score: 40, wins: 5, losses: 5 },
      });

      expect(result).toBe(40);
    });

    it('falls back to the current row power_score when career_power_score is null', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedSeasonStats: [],
        prefetchedCurrentTeamData: {
          power_score: 60,
          career_power_score: null,
          wins: 5,
          losses: 5,
        },
      });

      expect(result).toBe(60);
    });

    it.each([
      ['wins is null', { power_score: 90, wins: null, losses: 3 }],
      ['losses is null', { power_score: 90, wins: 3, losses: null }],
      ['the team has no matches', { power_score: 90, wins: 0, losses: 0 }],
      ['the score is null', { power_score: null, wins: 5, losses: 5 }],
    ])('ignores the current row when %s', async (_label, currentTeamData) => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedCurrentTeamData: currentTeamData,
      });

      expect(result).toBe(50);
    });

    it('weights historical and current rows by matches played', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedSeasonStats: [
          { power_score: 0.8, match_wins: 5, match_losses: 5, season_id: 'past' },
        ],
        prefetchedCurrentTeamData: { power_score: 50, wins: 20, losses: 10 },
      });

      // (80 * 10 + 50 * 30) / 40 = 57.5
      expect(result).toBeCloseTo(57.5, 10);
    });

    it('skips season rows with no matches or no score', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedSeasonStats: [
          { power_score: 0.9, match_wins: 0, match_losses: 0, season_id: 'empty' },
          { power_score: null, match_wins: 5, match_losses: 5, season_id: 'no-score' },
          { power_score: 0.5, match_wins: 5, match_losses: 5, season_id: 'real' },
        ],
      });

      expect(result).toBe(50);
    });

    it('counts a floored career_power_score of 0 instead of falling back', async () => {
      const result = await calculateCareerPowerScore({
        ...baseInput,
        prefetchedSeasonStats: [
          {
            power_score: 0.9,
            career_power_score: 0,
            match_wins: 5,
            match_losses: 5,
            season_id: 'z',
          },
        ],
      });

      expect(result).toBe(0);
    });
  });
});

describe('calculateCareerPowerScore database path', () => {
  const input = {
    teamId: 'team-db',
    championshipDivisions: [] as string[],
    runnerUpDivisions: [] as string[],
    careerPlayoffWins: 0,
    careerPlayoffLosses: 0,
    competitivePlayoffWins: 0,
    teamDivisionWeight: 1.0,
  };

  beforeEach(() => {
    careerQuery.fetchTeamSeasonPowerScores.mockResolvedValue([
      { power_score: 0.8, match_wins: 5, match_losses: 5, season_id: 'past' },
      { power_score: 0.2, match_wins: 5, match_losses: 5, season_id: 'active' },
    ]);
    careerQuery.fetchCurrentTeamPower.mockResolvedValue({ power_score: 60, wins: 5, losses: 5 });
    careerQuery.fetchActiveSeasonId.mockResolvedValue('active');
  });

  it('fetches the active season and excludes it from the season rows', async () => {
    const result = await calculateCareerPowerScore(input);

    expect(careerQuery.fetchTeamSeasonPowerScores).toHaveBeenCalledWith('team-db');
    expect(careerQuery.fetchCurrentTeamPower).toHaveBeenCalledWith('team-db');
    expect(careerQuery.fetchActiveSeasonId).toHaveBeenCalledTimes(1);
    // (80 * 10 + 60 * 10) / 20 = 70; the 'active' season row is left out
    expect(result).toBeCloseTo(70, 10);
  });

  it('does not look up the active season when currentSeasonId is given', async () => {
    const result = await calculateCareerPowerScore({ ...input, currentSeasonId: 'active' });

    expect(careerQuery.fetchActiveSeasonId).not.toHaveBeenCalled();
    expect(result).toBeCloseTo(70, 10);
  });

  it('keeps every season row when no active season exists', async () => {
    careerQuery.fetchActiveSeasonId.mockResolvedValue(null);

    const result = await calculateCareerPowerScore(input);

    // (80 * 10 + 20 * 10 + 60 * 10) / 30 = 53.33
    expect(result).toBeCloseTo(53.3333333, 6);
  });

  it('uses the database when only one of the two prefetched values is given', async () => {
    const result = await calculateCareerPowerScore({
      ...input,
      prefetchedSeasonStats: [],
    });

    expect(careerQuery.fetchTeamSeasonPowerScores).toHaveBeenCalledTimes(1);
    expect(result).toBeCloseTo(70, 10);
  });

  it('skips the database when both prefetched values are given, even as null', async () => {
    const result = await calculateCareerPowerScore({
      ...input,
      prefetchedSeasonStats: null,
      prefetchedCurrentTeamData: null,
    });

    expect(careerQuery.fetchTeamSeasonPowerScores).not.toHaveBeenCalled();
    expect(careerQuery.fetchCurrentTeamPower).not.toHaveBeenCalled();
    expect(careerQuery.fetchActiveSeasonId).not.toHaveBeenCalled();
    expect(result).toBe(0);
  });
});
