import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

import { useBracketData } from '@/hooks/brackets/useBracketData';
import { useBracketsManagerRealtime } from '@/hooks/brackets/useBracketsManagerRealtime';
import { useBracketCompletion } from '@/hooks/useBracketCompletion';
import { fetchBracketInfo } from '@/services/brackets/BracketReadService';
import type { BracketViewData } from '@/types/playoff';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Everything the bracket page needs to load: the bracket-info check (JSONB
 * brackets), the legacy bracket fetch, completion handling, the realtime
 * subscription, and the choice of which bracket to display.
 */
export const useBracketViewData = (
  bracketId: string,
  legacyBracket: BracketViewData | undefined
) => {
  const {
    data: bracketInfo,
    isLoading: isLoadingBracketInfo,
    error: bracketInfoError,
  } = useQuery({
    queryKey: ['bracket-info', bracketId],
    queryFn: async () => {
      bracketLog('Fetching bracket info for JSONB check:', bracketId);
      const data = await fetchBracketInfo(bracketId);

      bracketLog('Bracket info fetched:', {
        id: data.id,
        title: data.title,
        uses_brackets_manager: data.uses_brackets_manager,
        has_bracket_data: !!data.bracket_data,
      });

      return data;
    },
    enabled: !!bracketId && typeof bracketId === 'string',
  });

  const {
    data: fetchedBracket,
    isLoading: isLoadingLegacy,
    error: legacyError,
    refetch: refetchBracket,
    loadingProgress,
  } = useBracketData(bracketId);

  useBracketCompletion(bracketId || undefined);

  // Add realtime subscription for brackets-manager brackets (auto-fetches stageId if needed)
  const { realtimeEnabled, lastUpdate } = useBracketsManagerRealtime(
    bracketInfo?.uses_brackets_manager ? bracketId : null
  );

  useEffect(() => {
    if (realtimeEnabled) {
      bracketLog('BracketView: Realtime subscription active for bracket', { bracketId });
    }
  }, [realtimeEnabled, bracketId]);

  const isJsonbBracket = bracketInfo?.uses_brackets_manager && bracketInfo?.bracket_data;

  const displayBracket = useMemo(() => {
    if (legacyBracket) return legacyBracket;
    if (isJsonbBracket) return bracketInfo;
    return fetchedBracket;
  }, [legacyBracket, isJsonbBracket, bracketInfo, fetchedBracket]);

  const handleRetry = useCallback(async () => {
    bracketLog('Manual retry triggered for bracket:', bracketId);
    try {
      await refetchBracket();
      bracketLog('Manual retry completed successfully');
    } catch (retryError) {
      errorLog('Manual retry failed:', retryError);
    }
  }, [refetchBracket, bracketId]);

  return {
    bracketInfo,
    isLoadingBracketInfo,
    isLoadingLegacy,
    isLoading: isLoadingBracketInfo || isLoadingLegacy,
    error: bracketInfoError || legacyError,
    loadingProgress,
    displayBracket,
    isJsonbBracket,
    handleRetry,
    realtimeEnabled,
    lastUpdate,
  };
};

/** The bracket the page ends up showing: the prop, JSONB bracket info, or the fetched bracket. */
export type BracketViewDisplayBracket = ReturnType<typeof useBracketViewData>['displayBracket'];
