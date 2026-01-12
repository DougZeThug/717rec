import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';
import type { PredictionResult, TeamStats } from '@/utils/predictions';
import { isUpset, predictMatch } from '@/utils/predictions';

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
 */
export function useMatchPrediction({
  team1Details,
  team2Details,
  isCompleted,
  winnerId,
}: UseMatchPredictionParams): UseMatchPredictionResult {
  // Fetch division weights (cached after first fetch)
  const { data: divisionWeights, isLoading } = useQuery({
    queryKey: ['divisionWeights'],
    queryFn: fetchDivisionWeights,
    staleTime: 1000 * 60 * 10, // 10 minutes - divisions rarely change
  });

  // Compute prediction using memoization to avoid recalculation
  const result = useMemo(() => {
    // Can't compute without team stats or division weights
    if (!team1Details || !team2Details || !divisionWeights) {
      return { prediction: null, isUpsetResult: false };
    }

    const team1Stats: TeamStats = {
      power_score: team1Details.power_score,
      sos: team1Details.sos,
      division_id: team1Details.division_id,
    };

    const team2Stats: TeamStats = {
      power_score: team2Details.power_score,
      sos: team2Details.sos,
      division_id: team2Details.division_id,
    };

    const prediction = predictMatch(
      team1Stats,
      team2Stats,
      divisionWeights,
      team1Details.name,
      team2Details.name
    );

    // For completed matches, check if result was an upset
    let isUpsetResult = false;
    if (isCompleted && winnerId) {
      // Get the winner's probability
      const winnerProb =
        winnerId === team1Details.team_id ? prediction.probA : prediction.probB;
      isUpsetResult = isUpset(winnerProb);
    }

    return { prediction, isUpsetResult };
  }, [team1Details, team2Details, divisionWeights, isCompleted, winnerId]);

  return {
    ...result,
    isLoading,
  };
}
