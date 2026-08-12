import { describe, expect, it, vi } from 'vitest';
import { calculateCareerPowerScore } from '../calculateCareerPowerScore';

vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: vi.fn(async () => new Map<string, number>([
    ['competitive', 1.0],
    ['competitive low', 0.95],
    ['intermediate high', 0.8],
    ['intermediate', 0.7],
    ['intermediate low', 0.6],
    ['recreational', 0.35],
  ])),
  getDefaultDivisionWeight: () => 0.85,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          not: vi.fn(() => ({ data: [], error: null })),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

const activeSeason = '7df71033-ed43-40f7-bad6-8c411cf3a241';

const butterySeasonStats = [
  { power_score: 0.458, match_wins: 5, match_losses: 9, season_id: 's1' },
  { power_score: 0.593, match_wins: 11, match_losses: 5, season_id: 's2' },
  { power_score: 0.641, match_wins: 9, match_losses: 7, season_id: 's3' },
  { power_score: 0.703, match_wins: 12, match_losses: 4, season_id: 's4' },
  { power_score: 0.691, match_wins: 13, match_losses: 5, season_id: 's5' },
  { power_score: 0.638, match_wins: 13, match_losses: 6, season_id: 's6' },
  { power_score: 0.706, match_wins: 14, match_losses: 5, season_id: 's7' },
  { power_score: 0.688, match_wins: 13, match_losses: 4, season_id: activeSeason },
];

const pepperoniSeasonStats = [
  { power_score: 0.641, match_wins: 9, match_losses: 7, season_id: 's1' },
  { power_score: 0.680, match_wins: 11, match_losses: 5, season_id: 's2' },
  { power_score: 0.822, match_wins: 10, match_losses: 5, season_id: 's3' },
  { power_score: 0.693, match_wins: 9, match_losses: 7, season_id: 's4' },
  { power_score: 0.708, match_wins: 9, match_losses: 6, season_id: 's5' },
  { power_score: 0.681, match_wins: 8, match_losses: 7, season_id: 's6' },
  { power_score: 0.655, match_wins: 7, match_losses: 8, season_id: 's7' },
  { power_score: 0.686, match_wins: 8, match_losses: 7, season_id: activeSeason },
];

const getCurrent = (score: number, wins: number, losses: number) => ({ power_score: score, wins, losses });

describe('verify buttery vs pepperoni', () => {
  it('buttery nips', async () => {
    const result = await calculateCareerPowerScore({
      teamId: '01ec006b-6ee3-47b3-ac8d-f93cc11d3460',
      championshipDivisions: ['Intermediate', 'Intermediate', 'Intermediate'],
      runnerUpDivisions: ['Intermediate'],
      careerPlayoffWins: 90,
      careerPlayoffLosses: 45,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.8,
      playoffDivisions: ['Intermediate 2', 'Intermediate 2', 'Intermediate 2', 'Intermediate', 'Intermediate', 'Intermediate', 'Intermediate'],
      currentSeasonId: activeSeason,
      prefetchedSeasonStats: butterySeasonStats,
      prefetchedCurrentTeamData: getCurrent(68.8, 13, 4),
    });
    console.log('Buttery Nips career power score:', result);
    expect(result).toBeGreaterThan(0);
  });

  it('pepperoni cheesers', async () => {
    const result = await calculateCareerPowerScore({
      teamId: 'c9d644a4-4e5a-43a0-9805-9d93299cda35',
      championshipDivisions: ['Intermediate 1'],
      runnerUpDivisions: [],
      careerPlayoffWins: 71,
      careerPlayoffLosses: 52,
      competitivePlayoffWins: 0,
      teamDivisionWeight: 0.95,
      playoffDivisions: ['Intermediate 1', 'Intermediate 1', 'Competitive', 'Competitive', 'Competitive', 'Competitive', 'Competitive'],
      currentSeasonId: activeSeason,
      prefetchedSeasonStats: pepperoniSeasonStats,
      prefetchedCurrentTeamData: getCurrent(68.6, 8, 7),
    });
    console.log('Pepperoni Cheesers career power score:', result);
    expect(result).toBeGreaterThan(0);
  });
});
