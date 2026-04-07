import { describe, expect, it } from 'vitest';

import { Team } from '@/types';

import { analyzeGreedyFeasibility } from '../feasibility';
import { pairKey } from '../pairKey';

function makeTeam(id: string, tier: number): Team {
  const divisionName =
    tier === 1 ? 'Competitive' : tier === 2 ? 'Intermediate' : 'Recreational';
  return {
    id,
    name: `Team ${id}`,
    division_id: `div-${tier}`,
    divisionName,
    logo_url: null,
    image_url: null,
    players: [],
    wins: 0,
    losses: 0,
    game_wins: 0,
    game_losses: 0,
    seed: null,
    created_at: new Date().toISOString(),
    challonge_participant_id: null,
    spotify_url: null,
  } as Team;
}

describe('analyzeGreedyFeasibility', () => {
  it('returns feasible when all teams have enough valid opponents', () => {
    const teams = [
      makeTeam('1', 1),
      makeTeam('2', 1),
      makeTeam('3', 1),
      makeTeam('4', 1),
    ];
    const result = analyzeGreedyFeasibility(teams, new Set(), new Set(), 1);
    expect(result.isFeasible).toBe(true);
    expect(result.recommendedLevel).toBe(0);
    expect(result.atRiskTeams).toHaveLength(0);
  });

  it('recommends level 1 when tier relaxation would help', () => {
    // 3 teams: tier 1, tier 2, tier 3.
    // At level 0 with maxTierGap=1: T1 can play T2, T3 can play T2, but T2 only has 2 opponents — wait that's enough.
    // Use 4 teams where some are stuck: T1, T1, T3, T3 with gap=1.
    // T1s can only play T1s (1 opponent each) — need 2. T3s can only play T3s (1 opponent each).
    const teams = [
      makeTeam('1', 1),
      makeTeam('2', 1),
      makeTeam('3', 3),
      makeTeam('4', 3),
    ];
    const result = analyzeGreedyFeasibility(teams, new Set(), new Set(), 1);
    expect(result.isFeasible).toBe(false);
    expect(result.recommendedLevel).toBe(1);
    expect(result.atRiskTeams.length).toBeGreaterThan(0);
  });

  it('recommends level 2 when only rematch relaxation helps', () => {
    // 3 same-tier teams where all pairs already played — each has 0 fresh opponents
    const teams = [
      makeTeam('1', 1),
      makeTeam('2', 1),
      makeTeam('3', 1),
    ];
    const playedSet = new Set([
      pairKey('1', '2'),
      pairKey('1', '3'),
      pairKey('2', '3'),
    ]);
    const result = analyzeGreedyFeasibility(teams, playedSet, new Set(), 1);
    expect(result.isFeasible).toBe(false);
    expect(result.recommendedLevel).toBe(2);
  });

  it('recommends level 3 when no valid pairings exist even at level 2', () => {
    // 3 teams where all pairs are in tonightPairs — impossible even fully relaxed
    const teams = [
      makeTeam('1', 1),
      makeTeam('2', 1),
      makeTeam('3', 1),
    ];
    const tonightPairs = new Set([
      pairKey('1', '2'),
      pairKey('1', '3'),
      pairKey('2', '3'),
    ]);
    const result = analyzeGreedyFeasibility(teams, new Set(), tonightPairs, 1);
    expect(result.isFeasible).toBe(false);
    expect(result.recommendedLevel).toBe(3);
  });
});
