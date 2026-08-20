import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  PowerWeightMutationResult,
  PowerWeightSandboxService,
  PowerWeightState,
  toPowerScoreWeights,
} from '@/services/admin/PowerWeightSandboxService';
import { fetchAllTeamsCareerData } from '@/services/career/CareerService';
import {
  DEFAULT_POWER_SCORE_WEIGHTS,
  isValidWeights,
  PowerScoreWeights,
} from '@/utils/powerScore/weights';

import { useTeamsQuery } from '../teams/useTeamsQuery';
import { buildCareerWeightPreview, CareerPreviewRow } from './buildCareerWeightPreview';
import { buildSeasonWeightPreview, SeasonDivisionPreview } from './buildSeasonWeightPreview';

const STATE_KEY = ['admin', 'power-sandbox', 'state'] as const;
const PREVIEW_DATA_KEY = ['admin', 'power-sandbox', 'preview-data'] as const;
const PREVIEW_KEY = ['admin', 'power-sandbox', 'preview'] as const;

export interface PowerWeightPreview {
  season: SeasonDivisionPreview[];
  career: CareerPreviewRow[];
}

/** The live weight triple (and the one a revert would restore). */
export const usePowerWeightState = () =>
  useQuery({
    queryKey: STATE_KEY,
    queryFn: () => PowerWeightSandboxService.fetchWeightState(),
    staleTime: 60_000,
  });

/** The triple previews are computed against: the live row, or the pre-sandbox default. */
export const baselineWeights = (state: PowerWeightState | undefined): PowerScoreWeights =>
  state?.current ? toPowerScoreWeights(state.current) : DEFAULT_POWER_SCORE_WEIGHTS;

/**
 * Live preview of both standings under a candidate triple, in two stages so
 * sliding the weights never refetches anything:
 *
 * 1. A data query gathers everything the previews eat — bulk career data for
 *    all teams (hidden included, like /stats) plus the raw formula components
 *    for the current season and for every historical season. Keyed on each
 *    team's formula-derived numbers, so a Save/Revert invalidation re-runs it
 *    when the refreshed teams query lands (same reasoning as the power
 *    migration comparison).
 * 2. A compute query runs the pure builders for candidate vs. baseline.
 *    keepPreviousData holds the last preview on screen while a new triple
 *    computes, so the tables update without flashing empty.
 */
export const usePowerWeightPreview = (
  candidate: PowerScoreWeights,
  state: PowerWeightState | undefined
) => {
  const enabled = state !== undefined;
  const { data: teams } = useTeamsQuery({ includeHidden: true, enabled });
  const baseline = baselineWeights(state);

  const dataQuery = useQuery({
    queryKey: [
      ...PREVIEW_DATA_KEY,
      teams?.map((t) => [t.id, t.power_score ?? null, t.wins ?? null, t.losses ?? null]),
    ],
    queryFn: async () => {
      const [bulkData, currentComponents, seasonComponents] = await Promise.all([
        fetchAllTeamsCareerData(teams?.map((t) => t.id) ?? []),
        PowerWeightSandboxService.fetchCurrentSeasonComponents(),
        PowerWeightSandboxService.fetchAllSeasonsComponents(),
      ]);
      return { bulkData, currentComponents, seasonComponents };
    },
    enabled: enabled && Boolean(teams),
    staleTime: 5 * 60_000,
  });

  const previewInputs = dataQuery.data;
  return useQuery<PowerWeightPreview>({
    queryKey: [
      ...PREVIEW_KEY,
      candidate.win,
      candidate.sos,
      candidate.game,
      baseline.win,
      baseline.sos,
      baseline.game,
      dataQuery.dataUpdatedAt,
    ],
    queryFn: async () => {
      const inputs = previewInputs as NonNullable<typeof previewInputs>;
      const season = buildSeasonWeightPreview({
        teams: teams ?? [],
        components: inputs.currentComponents,
        baseline,
        candidate,
      });
      const career = await buildCareerWeightPreview({
        teams: teams ?? [],
        bulkData: inputs.bulkData,
        seasonComponents: inputs.seasonComponents,
        currentComponents: inputs.currentComponents,
        baseline,
        candidate,
      });
      return { season, career };
    },
    enabled: Boolean(previewInputs) && Boolean(teams) && isValidWeights(candidate),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });
};

/**
 * Save/Revert rewrite the formula behind every stored power score, which
 * feeds teams, careerRankings, history, trends, recap and more. A blanket
 * invalidation is the smallest change that is guaranteed to leave no stale
 * number on screen (same reasoning as the power migration controls).
 */
const useWeightMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<PowerWeightMutationResult>
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
};

/** Apply a candidate triple for real (recomputes all seasons, archived included). */
export const useApplyPowerWeights = () =>
  useWeightMutation((variables: { weights: PowerScoreWeights; note?: string }) =>
    PowerWeightSandboxService.applyWeights(variables.weights, variables.note)
  );

/** Go back to the previous triple. */
export const useRevertPowerWeights = () =>
  useWeightMutation((_variables: void) => PowerWeightSandboxService.revertWeights());
