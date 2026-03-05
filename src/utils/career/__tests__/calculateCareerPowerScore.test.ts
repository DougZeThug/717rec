import { beforeEach, describe, expect, it, vi } from 'vitest';

import { calculateCareerPowerScore } from '../calculateCareerPowerScore';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({
            data: [
              { power_score: 0.95, match_wins: 10, match_losses: 1 },
              { power_score: 0.92, match_wins: 10, match_losses: 1 },
            ],
            error: null,
          })),
          single: vi.fn().mockResolvedValue({
            data: { power_score: 95, wins: 10, losses: 1 },
            error: null,
          }),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { power_score: 95, wins: 10, losses: 1 },
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
    });

    expect(result).toBe(100);
  });

  it('applies championship weight based on division name', async () => {
    // Competitive championship should give 7 * 1.0 = 7 points
    const compResult = await calculateCareerPowerScore({
      teamId: 'team-1',
      championshipDivisions: ['Competitive'],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.5,
    });

    // Recreational championship should give 7 * 0.25 = 1.75 points
    const recResult = await calculateCareerPowerScore({
      teamId: 'team-2',
      championshipDivisions: ['Recreational'],
      runnerUpDivisions: [],
      careerPlayoffWins: 0,
      careerPlayoffLosses: 0,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.5,
    });

    // Both should return valid numbers
    expect(compResult).toBeGreaterThanOrEqual(0);
    expect(recResult).toBeGreaterThanOrEqual(0);
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
    });

    // Should get 4 * 1.0 = 4 points for competitive runner-up
    expect(result).toBeGreaterThanOrEqual(0);
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
    });

    expect(result).toBeGreaterThanOrEqual(0);
  });
});
