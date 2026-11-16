import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTeamTotalsComputed } from '@/hooks/career/useTeamTotalsComputed';
import { calculateCareerPowerScore } from '@/services/career/calculateCareerPowerScore';
import type { CareerData } from '@/services/career/CareerTypes';
import type {
  ArchivedMatchData,
  MatchData,
  PlayoffMatchData,
  SeasonStats,
  TeamTotals,
} from '@/utils/career/types';

import { computeTotalsFromBulkData } from '../computeAllTeamsTotals';

// The league has TWO places that turn one team's career data into TeamTotals:
// the bulk path (computeTotalsFromBulkData, behind the career rankings) and the
// single-team hook (useTeamTotalsComputed, behind the Team page). They repeat
// about 130 lines. This file feeds ONE fixture through both and pins that they
// agree, so a fix made on one path and forgotten on the other fails here.
//
// The real calculateCareerPowerScore runs on both paths. It is only spied on, so
// the test can read the arguments each path hands it. Only the data boundary is
// faked: the two fetchers, the career queries and the live division weights.

const { mockFetchCareerData, mockFetchDivisionWeightsByName, careerQuery } = vi.hoisted(() => ({
  mockFetchCareerData: vi.fn(),
  mockFetchDivisionWeightsByName: vi.fn(),
  careerQuery: {
    fetchTeamSeasonPowerScores: vi.fn(),
    fetchCurrentTeamPower: vi.fn(),
    fetchActiveSeasonId: vi.fn(),
  },
}));

vi.mock('@/services/career/CareerService', () => ({
  fetchCareerData: (...args: unknown[]) => mockFetchCareerData(...args),
  fetchAllTeamsCareerData: vi.fn(),
}));

vi.mock('@/services/divisionWeightsCache', () => ({
  fetchDivisionWeightsByName: () => mockFetchDivisionWeightsByName(),
}));

// The hook path has no prefetched rows, so the real function reads these three.
vi.mock('@/services/career/CareerQueryService', () => ({
  CareerQueryService: careerQuery,
}));

// A spy that runs the real function: the totals below are real totals.
vi.mock('@/services/career/calculateCareerPowerScore', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/career/calculateCareerPowerScore')>();
  return { calculateCareerPowerScore: vi.fn(actual.calculateCareerPowerScore) };
});

type ScoreArgs = Parameters<typeof calculateCareerPowerScore>[0];
type CurrentTeamPowerData = Parameters<typeof computeTotalsFromBulkData>[2];
type SeasonPowerScores = Parameters<typeof computeTotalsFromBulkData>[1]['seasonPowerScores'];

const TEAM_ID = 'team-1';

// The live-style names the fixtures use. Hidden is rated here on purpose: the
// test only needs both paths to treat every name the same way.
const WEIGHTS = new Map<string, number | null>([
  ['competitive', 1],
  ['intermediate', 0.7],
  ['recreational', 0.35],
  ['hidden', 0.6],
]);

/** A team_season_stats row as the fetchers return it (the extra fields feed the power score). */
interface SeasonRow extends SeasonStats {
  season_id: string;
  seasons: { name: string };
  power_score: number | null;
  career_power_score: number | null;
}

/** What the bulk fetcher keeps for the power score (CareerBulkFetchService, `seasonPowerScores`). */
const powerScoresOf = (rows: SeasonRow[]): SeasonPowerScores =>
  rows
    .filter((row) => row.power_score !== null)
    .map((row) => ({
      power_score: row.power_score,
      career_power_score: row.career_power_score,
      match_wins: row.match_wins,
      match_losses: row.match_losses,
      season_id: row.season_id,
    }));

interface PathFixture {
  name: string;
  careerData: CareerData;
  /** The season rows the career query returns for this team (the hook path reads them itself). */
  seasonPowerScores: SeasonPowerScores;
  /** The v_team_details row the Teams list carries for this team. */
  currentTeamPowerData: CurrentTeamPowerData;
  /** What both paths must hand calculateCareerPowerScore, apart from the prefetched keys. */
  expectedScoreArgs: Omit<ScoreArgs, 'prefetchedSeasonStats' | 'prefetchedCurrentTeamData'>;
  /** A few totals fixed by hand, so "both paths agree" cannot mean "both are empty". */
  expectedTotals: Partial<TeamTotals>;
}

// ── Fixture 1: a full history ────────────────────────────────────────────────
// A title in a rated division, a runner-up finish in a name that matches no
// division (unrated), a third place in Hidden, and the current season (also
// stored in team_season_stats; both paths leave it out of the history). The
// team's stored division weight is 0.

const FULL_SEASONS: SeasonRow[] = [
  {
    season_id: 'season-1',
    seasons: { name: 'Spring 2025' },
    division_name: 'Competitive',
    match_wins: 8,
    match_losses: 2,
    game_wins: 17,
    game_losses: 6,
    champion: true,
    runner_up: false,
    playoff_rank: 1,
    sos: 0.9,
    power_score: 0.7,
    career_power_score: 0.68,
  },
  {
    season_id: 'season-2',
    seasons: { name: 'Autumn 2025' },
    division_name: 'Mystery League',
    match_wins: 5,
    match_losses: 5,
    game_wins: 11,
    game_losses: 12,
    champion: false,
    runner_up: true,
    playoff_rank: 2,
    sos: 0.5,
    power_score: 0.5,
    career_power_score: 0.5,
  },
  {
    season_id: 'season-0',
    seasons: { name: 'Winter 2024' },
    division_name: 'Hidden',
    match_wins: 2,
    match_losses: 4,
    game_wins: 5,
    game_losses: 9,
    champion: false,
    runner_up: false,
    playoff_rank: 3,
    sos: 0.4,
    power_score: 0.3,
    career_power_score: 0.3,
  },
  {
    season_id: 'season-3',
    seasons: { name: 'Spring 2026' },
    division_name: 'Competitive',
    match_wins: 3,
    match_losses: 1,
    game_wins: 6,
    game_losses: 3,
    champion: false,
    runner_up: false,
    playoff_rank: null,
    sos: 0.8,
    power_score: 0.9,
    career_power_score: 0.9,
  },
];

const FULL_CURRENT_MATCHES: MatchData[] = [
  // A 2-0 sweep of an Intermediate team (found in the history map).
  {
    season_id: 'season-3',
    team1_id: TEAM_ID,
    team2_id: 'opp-a',
    winner_id: TEAM_ID,
    loser_id: 'opp-a',
    team1_game_wins: 2,
    team2_game_wins: 0,
  },
  // A tie: completed with no winner. Neither a win nor a loss.
  {
    season_id: 'season-3',
    team1_id: 'opp-b',
    team2_id: TEAM_ID,
    winner_id: null,
    loser_id: null,
    team1_game_wins: 1,
    team2_game_wins: 1,
    team1: { id: 'opp-b', divisions: { name: 'Competitive' } },
  },
  // A 1-2 loss to a Recreational team (division read from the joined row).
  {
    season_id: 'season-3',
    team1_id: TEAM_ID,
    team2_id: 'opp-c',
    winner_id: 'opp-c',
    loser_id: TEAM_ID,
    team1_game_wins: 1,
    team2_game_wins: 2,
    team2: { id: 'opp-c', divisions: { name: 'Recreational' } },
  },
  // A 2-1 win over a Hidden team: left out of the division records.
  {
    season_id: 'season-3',
    team1_id: 'opp-h',
    team2_id: TEAM_ID,
    winner_id: TEAM_ID,
    loser_id: 'opp-h',
    team1_game_wins: 1,
    team2_game_wins: 2,
    team1: { id: 'opp-h', divisions: { name: 'Hidden' } },
  },
];

const FULL_ARCHIVED_MATCHES: ArchivedMatchData[] = [
  // A 2-0 sweep of a Competitive team (season-1, found in the history map).
  {
    season_id: 'season-1',
    team1_id: TEAM_ID,
    team2_id: 'opp-a',
    winner_id: TEAM_ID,
    loser_id: 'opp-a',
    team1_game_wins: 2,
    team2_game_wins: 0,
  },
  // A 1-2 loss to a team that was in Hidden that season: left out of the records.
  {
    season_id: 'season-0',
    team1_id: 'opp-h',
    team2_id: TEAM_ID,
    winner_id: 'opp-h',
    loser_id: TEAM_ID,
    team1_game_wins: 2,
    team2_game_wins: 1,
  },
];

const FULL_PLAYOFF_MATCHES: PlayoffMatchData[] = [
  // A 2-0 win in a Competitive bracket (an earlier season).
  {
    bracket_id: 'bracket-comp',
    team1_id: TEAM_ID,
    team2_id: 'opp-a',
    winner_id: TEAM_ID,
    loser_id: 'opp-a',
    team1_score: 2,
    team2_score: 0,
  },
  // A 1-2 loss in the same bracket.
  {
    bracket_id: 'bracket-comp',
    team1_id: 'opp-b',
    team2_id: TEAM_ID,
    winner_id: 'opp-b',
    loser_id: TEAM_ID,
    team1_score: 2,
    team2_score: 1,
  },
  // A 2-1 win in a Recreational bracket of the current season.
  {
    bracket_id: 'bracket-rec',
    team1_id: TEAM_ID,
    team2_id: 'opp-c',
    winner_id: TEAM_ID,
    loser_id: 'opp-c',
    team1_score: 2,
    team2_score: 1,
  },
];

const FULL_HISTORY: PathFixture = {
  name: 'a full history (tie, unrated name, Hidden name, weight 0, playoff finishes)',
  careerData: {
    teamData: { divisions: { division_weight: 0 } },
    seasonStats: FULL_SEASONS,
    currentMatches: FULL_CURRENT_MATCHES,
    archivedMatches: FULL_ARCHIVED_MATCHES,
    playoffMatches: FULL_PLAYOFF_MATCHES,
    teamDivisionMap: new Map([
      ['opp-a_season-3', 'Intermediate'],
      ['opp-a_season-1', 'Competitive'],
      ['opp-h_season-0', 'Hidden'],
    ]),
    bracketDivisionWeights: { 'bracket-comp': 1, 'bracket-rec': 0.35 },
    bracketDivisionDisplayNames: { 'bracket-comp': 'Competitive', 'bracket-rec': 'Recreational' },
    bracketSeasonMap: { 'bracket-comp': 'season-1', 'bracket-rec': 'season-3' },
    teamDivisionWeight: 0,
    currentSeasonId: 'season-3',
  },
  seasonPowerScores: powerScoresOf(FULL_SEASONS),
  // 3 wins (two regular, one playoff) and 1 loss, as v_team_details counts them.
  currentTeamPowerData: { power_score: 62, career_power_score: 60, wins: 3, losses: 1 },
  expectedScoreArgs: {
    teamId: TEAM_ID,
    championshipDivisions: ['Competitive'],
    runnerUpDivisions: ['Mystery League'],
    careerPlayoffWins: 2,
    careerPlayoffLosses: 1,
    competitivePlayoffWins: 1,
    teamDivisionWeight: 0,
    playoffDivisions: ['Competitive', 'Mystery League', 'Hidden'],
    currentSeasonId: 'season-3',
  },
  expectedTotals: {
    // 15 + 11 from the three past seasons, then two regular wins, one loss
    // (the tie counts for nothing) and one current-season playoff win.
    career_match_wins: 18,
    career_match_losses: 12,
    championships: 1,
    runner_ups: 1,
    career_playoff_wins: 2,
    career_playoff_losses: 1,
    // The two sweeps of opp-a (one current, one archived) and the 2-0 playoff win.
    career_sweeps: 3,
    // Five matches went to game 3 (two regular, one archived, two playoff): two were won.
    career_clutch_game3s: 5,
    career_clutch_wins: 2,
    playoff_finishes: [
      { rank: 1, season_name: 'Spring 2025', division_name: 'Competitive' },
      { rank: 2, season_name: 'Autumn 2025', division_name: 'Mystery League' },
      { rank: 3, season_name: 'Winter 2024', division_name: 'Hidden' },
    ],
    // The tie and both Hidden opponents are in no record.
    division_records: {
      competitive: { wins: 2, losses: 1 },
      intermediate: { wins: 1, losses: 0 },
      recreational: { wins: 1, losses: 1 },
    },
  },
};

// ── Fixture 2: null arrays, no weight, no current season ─────────────────────

const NULL_ARRAYS: PathFixture = {
  name: 'null arrays (no history, no team weight, no current season)',
  careerData: {
    teamData: null,
    seasonStats: null,
    currentMatches: null,
    archivedMatches: null,
    playoffMatches: null,
    teamDivisionMap: new Map(),
    bracketDivisionWeights: {},
    bracketDivisionDisplayNames: {},
    bracketSeasonMap: {},
    teamDivisionWeight: null,
    currentSeasonId: null,
  },
  seasonPowerScores: [],
  currentTeamPowerData: null,
  expectedScoreArgs: {
    teamId: TEAM_ID,
    championshipDivisions: [],
    runnerUpDivisions: [],
    careerPlayoffWins: 0,
    careerPlayoffLosses: 0,
    competitivePlayoffWins: 0,
    teamDivisionWeight: null,
    playoffDivisions: [],
    currentSeasonId: null,
  },
  expectedTotals: {
    career_match_wins: 0,
    career_match_losses: 0,
    championships: 0,
    runner_ups: 0,
    playoff_finishes: [],
    career_power_score: 0,
  },
};

// ── The two paths ────────────────────────────────────────────────────────────

const PREFETCHED_KEYS = ['prefetchedSeasonStats', 'prefetchedCurrentTeamData'];

const withoutPrefetched = (args: ScoreArgs): Record<string, unknown> =>
  Object.fromEntries(Object.entries(args).filter(([key]) => !PREFETCHED_KEYS.includes(key)));

/** The arguments of the one call calculateCareerPowerScore just received. */
const lastScoreArgs = (): ScoreArgs => {
  const spy = vi.mocked(calculateCareerPowerScore);
  expect(spy).toHaveBeenCalledTimes(1);
  const call = spy.mock.lastCall;
  if (!call) throw new Error('calculateCareerPowerScore was not called');
  return call[0];
};

const runBulkPath = async (fixture: PathFixture) => {
  vi.mocked(calculateCareerPowerScore).mockClear();
  const totals = await computeTotalsFromBulkData(
    TEAM_ID,
    { ...fixture.careerData, seasonPowerScores: fixture.seasonPowerScores },
    fixture.currentTeamPowerData
  );
  return { totals, args: lastScoreArgs() };
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const runHookPath = async (fixture: PathFixture) => {
  vi.mocked(calculateCareerPowerScore).mockClear();
  mockFetchCareerData.mockResolvedValue(fixture.careerData);
  // What the real function reads from the database when it is given no prefetched rows.
  careerQuery.fetchTeamSeasonPowerScores.mockResolvedValue(fixture.seasonPowerScores);
  careerQuery.fetchCurrentTeamPower.mockResolvedValue(fixture.currentTeamPowerData);
  careerQuery.fetchActiveSeasonId.mockResolvedValue(fixture.careerData.currentSeasonId);

  const { result } = renderHook(() => useTeamTotalsComputed(TEAM_ID), {
    wrapper: createWrapper(),
  });
  await waitFor(() => expect(result.current.totals).toBeDefined());
  return { totals: result.current.totals, args: lastScoreArgs() };
};

describe.each([FULL_HISTORY, NULL_ARRAYS])(
  'career totals: bulk path and single-team hook, $name',
  (fixture) => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockFetchDivisionWeightsByName.mockResolvedValue(WEIGHTS);
    });

    it('gives the same totals on both paths', async () => {
      const bulk = await runBulkPath(fixture);
      const hook = await runHookPath(fixture);

      expect(bulk.totals).toMatchObject(fixture.expectedTotals);
      expect(hook.totals).toEqual(bulk.totals);
    });

    it('hands calculateCareerPowerScore the same arguments, apart from the prefetched data', async () => {
      const bulk = await runBulkPath(fixture);
      const hook = await runHookPath(fixture);

      expect(withoutPrefetched(bulk.args)).toStrictEqual(fixture.expectedScoreArgs);
      expect(withoutPrefetched(hook.args)).toStrictEqual(withoutPrefetched(bulk.args));
    });

    // calculateCareerPowerScore uses prefetched rows only when BOTH are not
    // undefined. The bulk path always gives both (null for a team with no
    // current row). The hook must leave both undefined so the function reads
    // them itself: a `?? null` there would silently drop the season history.
    it('leaves the prefetched data undefined on the hook path, so the function reads it itself', async () => {
      const bulk = await runBulkPath(fixture);
      expect(bulk.args.prefetchedSeasonStats).toBe(fixture.seasonPowerScores);
      expect(bulk.args.prefetchedCurrentTeamData).toBe(fixture.currentTeamPowerData);
      expect(careerQuery.fetchTeamSeasonPowerScores).not.toHaveBeenCalled();
      expect(careerQuery.fetchCurrentTeamPower).not.toHaveBeenCalled();

      const hook = await runHookPath(fixture);
      expect(hook.args.prefetchedSeasonStats).toBeUndefined();
      expect(hook.args.prefetchedCurrentTeamData).toBeUndefined();
      expect(careerQuery.fetchTeamSeasonPowerScores).toHaveBeenCalledWith(TEAM_ID);
      expect(careerQuery.fetchCurrentTeamPower).toHaveBeenCalledWith(TEAM_ID);
    });
  }
);

// The full history is worked out by hand, so the career score is not just "the
// same on both paths": it is the number below. Base: past seasons (10 matches
// at 68, 10 at 50, 6 at 30) plus the current 4 at 60 = 1600 / 30 = 53.3333.
// Bonus: title 7 x 1 x 1 = 7; the unrated runner-up adds 0; the playoff win
// rate 2/3 over the rated finishes (Competitive 1, Hidden 0.6, average 0.8):
// (2/3 - 0.5) x 4 x 0.8 = 0.5333; one Competitive playoff win 0.5. The cap is
// 15 x 1 x 1 = 15, so none is cut. 53.3333 + 8.0333 = 61.3667.
describe('career totals: the full history, worked out by hand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchDivisionWeightsByName.mockResolvedValue(WEIGHTS);
  });

  it('scores 61.3667 on both paths', async () => {
    const bulk = await runBulkPath(FULL_HISTORY);
    const hook = await runHookPath(FULL_HISTORY);

    expect(bulk.totals.career_power_score).toBeCloseTo(61.3667, 4);
    expect(hook.totals?.career_power_score).toBe(bulk.totals.career_power_score);
  });
});
