import { describe, expect, it, vi } from 'vitest';

import {
  PowerScoreComponentRow,
  SeasonPowerScoreComponentRow,
} from '@/services/admin/PowerWeightSandboxService';
import { BulkTeamCareerData } from '@/services/career/CareerService';
import { Team } from '@/types';

// The career pipeline resolves live division weights for playoff bonuses;
// none of these fixtures earn bonuses, and tests must not hit the network.
vi.mock('@/utils/rankingUtils/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: vi.fn(() => Promise.resolve(new Map<string, number>())),
  getDefaultDivisionWeight: () => 0.85,
}));

import { buildCareerWeightPreview } from '../buildCareerWeightPreview';

// Fixtures run through the REAL career pipeline (computeTotalsFromBulkData).
// No championships or playoff matches → career score is exactly the weighted
// average of season scores, which makes every expectation hand-computable:
//   career = Σ(season score × 100 × season matches) + current score × current matches
//            ─────────────────────────────────────────────────────────────────────
//                                    total matches

const CURRENT_SEASON = 's2';

const bulk = (seasonPowerScores: BulkTeamCareerData['seasonPowerScores']): BulkTeamCareerData => ({
  teamData: { divisions: { division_weight: 1.0 } },
  seasonStats: [],
  currentMatches: [],
  archivedMatches: [],
  playoffMatches: [],
  teamDivisionMap: new Map(),
  bracketDivisionWeights: {},
  bracketDivisionDisplayNames: {},
  bracketSeasonMap: {},
  teamDivisionWeight: 1.0,
  currentSeasonId: CURRENT_SEASON,
  seasonPowerScores,
});

const seasonComponent = (
  teamId: string,
  seasonId: string,
  weightedWinPct: number,
  sos: number,
  weightedGameWinPct: number
): SeasonPowerScoreComponentRow => ({
  team_id: teamId,
  season_id: seasonId,
  matches_played: 10,
  wins: 6,
  losses: 4,
  game_wins: 14,
  game_losses: 10,
  weighted_win_pct: weightedWinPct,
  sos,
  weighted_game_win_pct: weightedGameWinPct,
});

const currentComponent = (
  teamId: string,
  weightedWinPct: number,
  sos: number,
  weightedGameWinPct: number,
  matchesPlayed = 2,
  wins = 2,
  losses = 0
): PowerScoreComponentRow => ({
  team_id: teamId,
  matches_played: matchesPlayed,
  wins,
  losses,
  game_wins: 5,
  game_losses: 1,
  weighted_win_pct: weightedWinPct,
  sos,
  weighted_game_win_pct: weightedGameWinPct,
});

const baseline = { win: 40, sos: 45, game: 15 };
// Shifting 20 points from SOS to match wins rewards Bravo's raw win rate
// over Alpha's harder schedule.
const candidate = { win: 60, sos: 25, game: 15 };

// Alpha: one historical season s1 (8-2, components .8/.9/.7 → 83 under the
// baseline, 81 under the candidate) plus a 2-0 current season (components
// 1.0/.9/.8 → 92.5 baseline, 94.5 candidate).
// Bravo: s1 only (7-3, components .9/.7/.8 → 79.5 baseline, 83.5 candidate),
// nothing current. Stored values mirror what the live DB would hold today
// (i.e. the baseline outputs, on the DB's 0-1 storage scale).
const teams: Team[] = [
  { id: 'a', name: 'Alpha', divisionName: 'Competitive' },
  { id: 'b', name: 'Bravo', divisionName: 'Competitive' },
];

const buildInput = () => ({
  teams,
  bulkData: new Map<string, BulkTeamCareerData>([
    [
      'a',
      bulk([
        {
          power_score: 0.83,
          career_power_score: 0.83,
          match_wins: 8,
          match_losses: 2,
          season_id: 's1',
        },
      ]),
    ],
    [
      'b',
      bulk([
        {
          power_score: 0.795,
          career_power_score: 0.795,
          match_wins: 7,
          match_losses: 3,
          season_id: 's1',
        },
      ]),
    ],
  ]),
  seasonComponents: [
    seasonComponent('a', 's1', 0.8, 0.9, 0.7),
    seasonComponent('b', 's1', 0.9, 0.7, 0.8),
  ],
  currentComponents: [currentComponent('a', 1.0, 0.9, 0.8)],
  baseline,
  candidate,
});

describe('buildCareerWeightPreview', () => {
  it('reproduces the stored career ordering on the baseline side', async () => {
    const rows = await buildCareerWeightPreview(buildInput());

    const alpha = rows.find((r) => r.teamId === 'a');
    const bravo = rows.find((r) => r.teamId === 'b');
    // Scale pin: s1 goes in on the 0-1 scale (83 after ×100), the current
    // season on the 0-100 scale (92.5) — (83×10 + 92.5×2) / 12.
    expect(alpha?.baselineScore).toBeCloseTo(84.5833333, 5);
    expect(bravo?.baselineScore).toBeCloseTo(79.5, 5);
    expect(alpha?.baselineRank).toBe(1);
    expect(bravo?.baselineRank).toBe(2);
  });

  it('detects the candidate-side rank swap with correct scores and deltas', async () => {
    const rows = await buildCareerWeightPreview(buildInput());

    // Sorted by candidate rank: Bravo overtakes Alpha under 60/25/15.
    expect(rows.map((r) => r.teamId)).toEqual(['b', 'a']);

    const bravo = rows[0];
    expect(bravo.candidateScore).toBeCloseTo(83.5, 5);
    expect(bravo.candidateRank).toBe(1);
    expect(bravo.rankDelta).toBe(1); // moved up one spot
    expect(bravo.scoreDelta).toBeCloseTo(4, 5);

    const alpha = rows[1];
    // (81×10 + 94.5×2) / 12
    expect(alpha.candidateScore).toBeCloseTo(83.25, 5);
    expect(alpha.rankDelta).toBe(-1);
    expect(alpha.divisionName).toBe('Competitive');
  });

  it('keeps the stored score for a season with no component row', async () => {
    const input = {
      teams: [teams[0]],
      bulkData: new Map<string, BulkTeamCareerData>([
        [
          'a',
          bulk([
            // s0 predates the component views' match coverage: stored 0.5 stays.
            {
              power_score: 0.5,
              career_power_score: 0.5,
              match_wins: 5,
              match_losses: 5,
              season_id: 's0',
            },
            {
              power_score: 0.83,
              career_power_score: 0.83,
              match_wins: 8,
              match_losses: 2,
              season_id: 's1',
            },
          ]),
        ],
      ]),
      seasonComponents: [seasonComponent('a', 's1', 0.8, 0.9, 0.7)],
      currentComponents: [],
      baseline,
      candidate,
    };
    const rows = await buildCareerWeightPreview(input);

    // (50×10 + 83×10) / 20 and (50×10 + 81×10) / 20 — s0 identical on both sides.
    expect(rows[0].baselineScore).toBeCloseTo(66.5, 5);
    expect(rows[0].candidateScore).toBeCloseTo(65.5, 5);
  });

  it('falls back to the stored current-team numbers when this season has no rated match', async () => {
    const team: Team = {
      id: 'a',
      name: 'Alpha',
      divisionName: 'Competitive',
      power_score: 90,
      career_power_score: 90,
      wins: 2,
      losses: 0,
    };
    const input = {
      teams: [team],
      bulkData: new Map<string, BulkTeamCareerData>([
        [
          'a',
          bulk([
            {
              power_score: 0.83,
              career_power_score: 0.83,
              match_wins: 8,
              match_losses: 2,
              season_id: 's1',
            },
          ]),
        ],
      ]),
      seasonComponents: [seasonComponent('a', 's1', 0.8, 0.9, 0.7)],
      // matches_played 0 → the stored 90 stands in, identical on both sides
      currentComponents: [currentComponent('a', 0, 0.5, 0, 0, 0, 0)],
      baseline,
      candidate,
    };
    const rows = await buildCareerWeightPreview(input);

    expect(rows[0].baselineScore).toBeCloseTo((83 * 10 + 90 * 2) / 12, 5);
    expect(rows[0].candidateScore).toBeCloseTo((81 * 10 + 90 * 2) / 12, 5);
  });

  it('skips teams with no bulk data instead of failing the whole preview', async () => {
    const input = { ...buildInput(), teams: [...teams, { id: 'ghost', name: 'Ghost' } as Team] };
    const rows = await buildCareerWeightPreview(input);
    expect(rows.map((r) => r.teamId).sort()).toEqual(['a', 'b']);
  });
});
