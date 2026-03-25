import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { HeadToHeadData } from '@/hooks/useBatchHeadToHead';
import type { HeadToHeadStats, PredictionResult, TeamStats } from '@/utils/predictions';
import { isUpset, predictMatch } from '@/utils/predictions';
import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';

import { useCareerRankings } from './useCareerRankings';
import { useMatchHeadToHead } from './useMatchHeadToHead';

interface TeamDetails {
  team_id: string;
  name: string;
  division_id: string | null;
  power_score: number | null;
  sos: number | null;
}

interface UseMatchPredictionParams {
  team1Details: TeamDetails | null | undefined;
  team2Details: TeamDetails | null | undefined;
  isCompleted: boolean;
  winnerId?: string;
  /** Pre-fetched H2H data from batch hook — when provided, skips the per-card H2H query */
  prefetchedH2H?: HeadToHeadData | null;
}

interface UseMatchPredictionResult {
  prediction: PredictionResult | null;
  isUpsetResult: boolean;
  isLoading: boolean;
}

/**
 * Hook to compute match prediction and detect upsets
 *
 * For upcoming matches: returns prediction with probabilities
 * For completed matches: also determines if result was an upset
 *
 * Uses: 65% Career Performance + 25% Current Season + 10% Head-to-Head
 *
 * When `prefetchedH2H` is supplied, the hook skips its own per-card
 * `useMatchHeadToHead` query, eliminating redundant network requests.
 */
export function useMatchPrediction({
  team1Details,
  team2Details,
  isCompleted,
  winnerId,
  prefetchedH2H,
}: UseMatchPredictionParams): UseMatchPredictionResult {
  // Fetch division weights (cached after first fetch)
  const { data: divisionWeights, isLoading: loadingDivisions } = useQuery({
    queryKey: ['divisionWeights'],
    queryFn: fetchDivisionWeights,
    staleTime: 1000 * 60 * 10, // 10 minutes - divisions rarely change
  });

  // Fetch career rankings (cached, used for career stats)
  const { data: careerRankings, isLoading: loadingCareer } = useCareerRankings();

  // Only fire per-card H2H query when no prefetched data was provided
  const hasPrefetchedH2H = prefetchedH2H !== undefined;
  const { data: fetchedH2HData, isLoading: loadingH2H } = useMatchHeadToHead(
    hasPrefetchedH2H ? undefined : team1Details?.team_id,
    hasPrefetchedH2H ? undefined : team2Details?.team_id
  );

  // Resolve H2H data: prefer prefetched, fall back to per-card fetch
  const h2hData = hasPrefetchedH2H ? prefetchedH2H : fetchedH2HData;

  // Compute prediction using memoization to avoid recalculation
  const result = useMemo(() => {
    // Can't compute without team stats or division weights
    if (!team1Details || !team2Details || !divisionWeights) {
      return { prediction: null, isUpsetResult: false };
    }

    // Look up career stats for both teams
    const team1Career = careerRankings?.find((r) => r.teamId === team1Details.team_id);
    const team2Career = careerRankings?.find((r) => r.teamId === team2Details.team_id);

    const team1Stats: TeamStats = {
      // Current season stats
      power_score: team1Details.power_score,
      sos: team1Details.sos,
      division_id: team1Details.division_id,
      // Career stats
      career_power_score: team1Career?.careerPowerScore ?? null,
      career_sos: team1Career?.careerSos ?? null,
      career_win_percentage: team1Career?.careerWinPercentage ?? null,
    };

    const team2Stats: TeamStats = {
      // Current season stats
      power_score: team2Details.power_score,
      sos: team2Details.sos,
      division_id: team2Details.division_id,
      // Career stats
      career_power_score: team2Career?.careerPowerScore ?? null,
      career_sos: team2Career?.careerSos ?? null,
      career_win_percentage: team2Career?.careerWinPercentage ?? null,
    };

    // Prepare H2H data for prediction (if available)
    const h2hStats: HeadToHeadStats | null = h2hData
      ? {
          team1Wins: h2hData.team1Wins,
          team2Wins: h2hData.team2Wins,
          totalMatches: h2hData.totalMatches,
        }
      : null;

    const prediction = predictMatch(
      team1Stats,
      team2Stats,
      divisionWeights,
      team1Details.name,
      team2Details.name,
      h2hStats
    );

    // For completed matches, check if result was an upset
    let isUpsetResult = false;
    if (isCompleted && winnerId) {
      // Get the winner's probability
      const winnerProb = winnerId === team1Details.team_id ? prediction.probA : prediction.probB;
      isUpsetResult = isUpset(winnerProb);
    }

    return { prediction, isUpsetResult };
  }, [team1Details, team2Details, divisionWeights, careerRankings, h2hData, isCompleted, winnerId]);

  return {
    ...result,
    isLoading: loadingDivisions || loadingCareer || (!hasPrefetchedH2H && loadingH2H),
  };
}
