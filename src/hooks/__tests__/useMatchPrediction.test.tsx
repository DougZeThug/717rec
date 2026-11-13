import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';
import type { PredictionResult } from '@/utils/predictions';

// These tests pin the wiring only: which inputs the hook hands to the predictor,
// and how it reports loading, missing data and the upset flag. The math has its
// own tests (src/utils/predictions/__tests__), so every number below is a
// fixture value and none comes from the real prediction code.
const {
  mockFetchDivisionWeights,
  mockUseCareerRankings,
  mockUseMatchHeadToHead,
  mockPredictMatch,
  mockIsUpset,
} = vi.hoisted(() => ({
  mockFetchDivisionWeights: vi.fn(),
  mockUseCareerRankings: vi.fn(),
  mockUseMatchHeadToHead: vi.fn(),
  mockPredictMatch: vi.fn(),
  mockIsUpset: vi.fn(),
}));

vi.mock('@/services/divisionWeightsCache', () => ({
  fetchDivisionWeights: mockFetchDivisionWeights,
}));
vi.mock('@/hooks/useCareerRankings', () => ({ useCareerRankings: mockUseCareerRankings }));
vi.mock('@/hooks/useMatchHeadToHead', () => ({ useMatchHeadToHead: mockUseMatchHeadToHead }));
vi.mock('@/utils/predictions', () => ({
  predictMatch: mockPredictMatch,
  isUpset: mockIsUpset,
}));

import { useMatchPrediction } from '../useMatchPrediction';

type HookParams = Parameters<typeof useMatchPrediction>[0];

// Fixture values only; the real predictor uses a 0-100 Power Score scale.
const team1 = {
  team_id: 'team-1',
  name: 'Team One',
  division_id: 'div-a',
  power_score: 0.61,
  sos: 0.42,
};
const team2 = {
  team_id: 'team-2',
  name: 'Team Two',
  division_id: 'div-b',
  power_score: 0.33,
  sos: 0.55,
};

const divisionWeights = new Map([
  ['div-a', 0.6],
  ['div-b', 0.4],
]);

// Probabilities differ on purpose, so a swapped pick shows up.
const prediction: PredictionResult = {
  probA: 0.8,
  probB: 0.2,
  expectedText: 'fixture text',
  confidence: 'Medium',
  breakdown: {
    powerScoreA: 0,
    powerScoreB: 0,
    sosA: 0,
    sosB: 0,
    divisionWeightA: 0,
    divisionWeightB: 0,
    careerPowerA: 0,
    careerPowerB: 0,
    careerSosA: 0,
    careerSosB: 0,
    careerWinPctA: 0,
    careerWinPctB: 0,
    h2hWinsA: 0,
    h2hWinsB: 0,
    h2hTotalMatches: 0,
    h2hRatingA: 0,
    h2hRatingB: 0,
    h2hDominanceFactor: 0,
    hasH2HData: false,
    seasonRatingA: 0,
    seasonRatingB: 0,
    careerRatingA: 0,
    careerRatingB: 0,
    teamRatingA: 0,
    teamRatingB: 0,
    ratingDiff: 0,
    hasCareerDataA: false,
    hasCareerDataB: false,
  },
};

// Only the fields the hook reads. The mocked hook is untyped, so a short row is fine.
const careerRow = (
  teamId: string,
  careerPowerScore: number,
  careerSos: number,
  careerWinPercentage: number
) => ({ teamId, careerPowerScore, careerSos, careerWinPercentage });

// Fixture values only; the real predictor uses a 0-100 Power Score scale.
const career1 = careerRow('team-1', 0.71, 0.52, 0.66);
const career2 = careerRow('team-2', 0.44, 0.47, 0.38);

const perCardH2H = {
  team1Wins: 3,
  team2Wins: 1,
  totalMatches: 4,
  team1GameWins: 7,
  team2GameWins: 3,
};

const prefetchedH2H: HeadToHeadData = {
  team1Wins: 5,
  team2Wins: 2,
  totalMatches: 7,
  team1GameWins: 11,
  team2GameWins: 6,
  isFirstMeeting: false,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const renderPrediction = (overrides: Partial<HookParams> = {}) =>
  renderHook(
    () =>
      useMatchPrediction({
        team1Details: team1,
        team2Details: team2,
        isCompleted: false,
        ...overrides,
      }),
    { wrapper: createWrapper() }
  );

describe('useMatchPrediction', () => {
  beforeEach(() => {
    mockFetchDivisionWeights.mockResolvedValue(divisionWeights);
    mockUseCareerRankings.mockReturnValue({ data: [career1, career2], isLoading: false });
    mockUseMatchHeadToHead.mockReturnValue({ data: null, isLoading: false, isFirstMeeting: false });
    mockPredictMatch.mockReturnValue(prediction);
    mockIsUpset.mockReturnValue(false);
  });

  describe('while data is missing', () => {
    it("reports loading with no prediction until the division weights arrive (today's behaviour)", async () => {
      // Hold the weights back until the test lets them go.
      let releaseWeights: (weights: Map<string, number>) => void = vi.fn();
      mockFetchDivisionWeights.mockReturnValue(
        new Promise<Map<string, number>>((resolve) => {
          releaseWeights = resolve;
        })
      );

      const { result } = renderPrediction();
      await waitFor(() => expect(mockFetchDivisionWeights).toHaveBeenCalled());

      expect(result.current).toEqual({ prediction: null, isUpsetResult: false, isLoading: true });
      expect(mockPredictMatch).not.toHaveBeenCalled();

      releaseWeights(divisionWeights);
      await waitFor(() => expect(result.current.prediction).toBe(prediction));
      expect(result.current.isLoading).toBe(false);
    });

    it("returns no prediction once the division weights fail to load (today's behaviour)", async () => {
      mockFetchDivisionWeights.mockRejectedValue(new Error('weights down'));

      const { result } = renderPrediction({ isCompleted: true, winnerId: 'team-1' });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.prediction).toBeNull();
      expect(result.current.isUpsetResult).toBe(false);
      expect(mockPredictMatch).not.toHaveBeenCalled();
      expect(mockIsUpset).not.toHaveBeenCalled();
    });

    it.each([
      ['the first team has no details', { team1Details: null }],
      ['the second team has no details', { team2Details: undefined }],
    ] satisfies Array<[string, Partial<HookParams>]>)(
      "returns no prediction and no upset when %s (today's behaviour)",
      async (_label, missing) => {
        const { result } = renderPrediction({
          ...missing,
          isCompleted: true,
          winnerId: 'team-1',
        });
        // Not loading means the weights have arrived, so the missing team is the only gap.
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.prediction).toBeNull();
        expect(result.current.isUpsetResult).toBe(false);
        expect(mockPredictMatch).not.toHaveBeenCalled();
        expect(mockIsUpset).not.toHaveBeenCalled();
      }
    );
  });

  describe('what it hands to the predictor', () => {
    it("passes both teams' season and career stats, the weights and the names (today's behaviour)", async () => {
      // A record for a third team sits first, so the lookup must go by team id.
      mockUseCareerRankings.mockReturnValue({
        data: [careerRow('team-9', 0.9, 0.9, 0.9), career2, career1],
        isLoading: false,
      });

      const { result } = renderPrediction();
      await waitFor(() => expect(result.current.prediction).toBe(prediction));

      expect(mockPredictMatch).toHaveBeenLastCalledWith(
        {
          power_score: 0.61,
          sos: 0.42,
          division_id: 'div-a',
          career_power_score: 0.71,
          career_sos: 0.52,
          career_win_percentage: 0.66,
        },
        {
          power_score: 0.33,
          sos: 0.55,
          division_id: 'div-b',
          career_power_score: 0.44,
          career_sos: 0.47,
          career_win_percentage: 0.38,
        },
        divisionWeights,
        'Team One',
        'Team Two',
        null
      );
      expect(result.current).toEqual({ prediction, isUpsetResult: false, isLoading: false });
      // Not completed, so nobody asks whether it was an upset.
      expect(mockIsUpset).not.toHaveBeenCalled();
    });

    it("passes null career stats for a team with no career record (today's behaviour)", async () => {
      mockUseCareerRankings.mockReturnValue({ data: [career1], isLoading: false });

      const { result } = renderPrediction();
      await waitFor(() => expect(result.current.prediction).toBe(prediction));

      const [stats1, stats2] = mockPredictMatch.mock.lastCall ?? [];
      expect(stats1).toMatchObject({ career_power_score: 0.71, career_sos: 0.52 });
      expect(stats2).toEqual({
        power_score: 0.33,
        sos: 0.55,
        division_id: 'div-b',
        career_power_score: null,
        career_sos: null,
        career_win_percentage: null,
      });
    });

    it("passes null career stats for both teams while no career rankings exist (today's behaviour)", async () => {
      mockUseCareerRankings.mockReturnValue({ data: undefined, isLoading: false });

      const { result } = renderPrediction();
      await waitFor(() => expect(result.current.prediction).toBe(prediction));

      const [stats1, stats2] = mockPredictMatch.mock.lastCall ?? [];
      const noCareer = { career_power_score: null, career_sos: null, career_win_percentage: null };
      expect(stats1).toMatchObject(noCareer);
      expect(stats2).toMatchObject(noCareer);
    });

    it("looks up head-to-head for the two teams and passes only the three win counts (today's behaviour)", async () => {
      mockUseMatchHeadToHead.mockReturnValue({
        data: perCardH2H,
        isLoading: false,
        isFirstMeeting: false,
      });

      const { result } = renderPrediction();
      await waitFor(() => expect(result.current.prediction).toBe(prediction));

      expect(mockUseMatchHeadToHead).toHaveBeenLastCalledWith('team-1', 'team-2');
      expect(mockPredictMatch.mock.lastCall?.[5]).toEqual({
        team1Wins: 3,
        team2Wins: 1,
        totalMatches: 4,
      });
    });

    it("uses prefetched head-to-head and skips the per-card lookup (today's behaviour)", async () => {
      // The per-card hook would answer with other numbers, so a mix-up shows up.
      mockUseMatchHeadToHead.mockReturnValue({
        data: { ...perCardH2H, team1Wins: 9, team2Wins: 9, totalMatches: 18 },
        isLoading: false,
        isFirstMeeting: false,
      });

      const { result } = renderPrediction({ prefetchedH2H });
      await waitFor(() => expect(result.current.prediction).toBe(prediction));

      expect(mockUseMatchHeadToHead).toHaveBeenLastCalledWith(undefined, undefined);
      expect(mockPredictMatch.mock.lastCall?.[5]).toEqual({
        team1Wins: 5,
        team2Wins: 2,
        totalMatches: 7,
      });
    });
  });

  describe('isLoading', () => {
    it.each([
      [
        true,
        'the career rankings are loading',
        { data: undefined, isLoading: true },
        { data: null, isLoading: false, isFirstMeeting: false },
        undefined,
      ],
      [
        true,
        'the per-card head-to-head is loading',
        { data: [career1, career2], isLoading: false },
        { data: null, isLoading: true, isFirstMeeting: false },
        undefined,
      ],
      [
        false,
        'only the per-card head-to-head is loading but prefetched data was given',
        { data: [career1, career2], isLoading: false },
        { data: null, isLoading: true, isFirstMeeting: false },
        prefetchedH2H,
      ],
    ] satisfies Array<[boolean, string, unknown, unknown, HeadToHeadData | undefined]>)(
      "reports isLoading %s when %s (today's behaviour)",
      async (expected, _label, career, h2h, prefetched) => {
        mockUseCareerRankings.mockReturnValue(career);
        mockUseMatchHeadToHead.mockReturnValue(h2h);

        const { result } = renderPrediction({ prefetchedH2H: prefetched });
        // The predictor runs once the weights are in, so the flag below is not about them.
        await waitFor(() => expect(mockPredictMatch).toHaveBeenCalled());

        expect(result.current.isLoading).toBe(expected);
      }
    );
  });

  describe('upset flag', () => {
    it.each([
      ['the first team', 'team-1', 0.8, false],
      ['the second team', 'team-2', 0.2, true],
    ])(
      "asks isUpset about the probability of the winner, %s, and returns its answer (today's behaviour)",
      async (_label, winnerId, winnerProbability, answer) => {
        // The answers are fixture values. This test pins which probability the hook
        // hands to isUpset and that it returns the answer, not the upset rule itself.
        mockIsUpset.mockReturnValue(answer);

        const { result } = renderPrediction({ isCompleted: true, winnerId });
        await waitFor(() => expect(result.current.prediction).toBe(prediction));

        expect(mockIsUpset).toHaveBeenCalledWith(winnerProbability);
        expect(result.current.isUpsetResult).toBe(answer);
      }
    );

    it.each([
      ['the match is not completed', { isCompleted: false, winnerId: 'team-1' }],
      ['a completed match has no winner id', { isCompleted: true, winnerId: undefined }],
    ] satisfies Array<[string, Partial<HookParams>]>)(
      "does not check for an upset when %s (today's behaviour)",
      async (_label, params) => {
        // A wrongly called isUpset would answer true, so it would show in the result.
        mockIsUpset.mockReturnValue(true);

        const { result } = renderPrediction(params);
        await waitFor(() => expect(result.current.prediction).toBe(prediction));

        expect(mockIsUpset).not.toHaveBeenCalled();
        expect(result.current.isUpsetResult).toBe(false);
      }
    );
  });
});
