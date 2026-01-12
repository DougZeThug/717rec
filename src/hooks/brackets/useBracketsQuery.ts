import { useEffect, useState } from 'react';

import { fetchBracketsForSelector } from '@/services/brackets/BracketReadService';
import { errorLog } from '@/utils/logger';

/**
 * Shared hook for fetching brackets data
 * Consolidates duplicated bracket fetching logic across the app
 */
export const useBracketsQuery = () => {
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBrackets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBracketsForSelector();
      setBrackets(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      errorLog('Error fetching brackets:', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrackets();
  }, []);

  return {
    brackets,
    loading,
    error,
    refetch: fetchBrackets,
  };
};
