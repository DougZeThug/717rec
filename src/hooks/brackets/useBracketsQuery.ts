import { useEffect, useState } from 'react';

import { fetchBracketsForSelector } from '@/services/brackets/BracketReadService';
import { errorLog } from '@/utils/logger';

/**
 * Shared hook for fetching brackets data
 * Consolidates duplicated bracket fetching logic across the app
 */
export const useBracketsQuery = () => {
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);

  const fetchBrackets = async () => {
    try {
      const data = await fetchBracketsForSelector();
      setBrackets(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errorLog('Error fetching brackets:', message);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    fetchBrackets();
  }, []);

  return {
    brackets,
  };
};
