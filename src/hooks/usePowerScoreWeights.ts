import { useQuery } from '@tanstack/react-query';

import {
  PowerWeightSandboxService,
  toPowerScoreWeights,
} from '@/services/admin/PowerWeightSandboxService';
import { DEFAULT_POWER_SCORE_WEIGHTS, PowerScoreWeights } from '@/utils/powerScore/weights';

/**
 * The LIVE power score weight triple, for public copy (Help, FAQ, SEO
 * answers). The reader RPC is open to anonymous users; while it is loading,
 * errors, or the sandbox migration is not applied yet, the standard 40/45/15
 * falls in so copy never renders blank or wrong-shaped.
 */
export function usePowerScoreWeights(): PowerScoreWeights {
  const { data } = useQuery({
    queryKey: ['power-score-weights'],
    queryFn: () => PowerWeightSandboxService.fetchWeightState(),
    staleTime: 5 * 60_000,
  });
  return data?.current ? toPowerScoreWeights(data.current) : DEFAULT_POWER_SCORE_WEIGHTS;
}
