import { useQuery } from '@tanstack/react-query';

import { fetchFinalStandings } from '@/services/brackets/BracketReadService';

/**
 * Final placements for a bracket. The key `['final-standings', bracketId]` is
 * shared with `useRecalculateStandings`, which invalidates it after a manual
 * recalculation. Each caller says when to run it.
 */
export const useFinalStandings = (bracketId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['final-standings', bracketId],
    queryFn: () => fetchFinalStandings(bracketId),
    enabled,
  });
