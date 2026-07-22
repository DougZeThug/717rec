import { useQuery } from '@tanstack/react-query';

import { fetchBracketsForSelector } from '@/services/brackets/BracketReadService';
import type { BracketOption } from '@/services/brackets/read/BracketSelectorService';

// Stable fallback so consumers don't see a fresh [] reference every render.
const EMPTY_BRACKETS: BracketOption[] = [];

/**
 * Shared hook for fetching brackets data
 * Consolidates duplicated bracket fetching logic across the app.
 * Errors propagate to `error` so consumers can render a retryable failure
 * state instead of a silently empty list.
 */
export const useBracketsQuery = () => {
  const { data, error, isLoading, refetch } = useQuery({
    // Lives under the ['brackets'] prefix so bracket create/update flows that
    // invalidate ['brackets'] also refresh this selector list.
    queryKey: ['brackets', 'selector'],
    queryFn: () => fetchBracketsForSelector(),
  });

  return {
    brackets: data ?? EMPTY_BRACKETS,
    error: error ?? null,
    isLoading,
    refetch,
  };
};
