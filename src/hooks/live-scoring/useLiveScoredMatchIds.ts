import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { LiveScoredMatchesService } from '@/services/liveScoring/LiveScoredMatchesService';

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Returns the set of match IDs (from the input list) that have live-scoring
 * data recorded. Used to gate the "View match recap" CTA on schedule cards.
 */
export function useLiveScoredMatchIds(matchIds: string[]): {
  liveScoredIds: ReadonlySet<string>;
  isLoading: boolean;
} {
  const sortedIds = useMemo(() => [...matchIds].sort(), [matchIds]);

  const { data, isLoading } = useQuery({
    queryKey: ['live-scored-match-ids', sortedIds],
    queryFn: () => LiveScoredMatchesService.fetchLiveScoredMatchIds(sortedIds),
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  return {
    liveScoredIds: data ?? EMPTY_SET,
    isLoading,
  };
}
