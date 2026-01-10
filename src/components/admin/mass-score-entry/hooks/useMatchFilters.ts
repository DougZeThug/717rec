import { useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { errorLog, filterLog } from '@/utils/logger';

import { FilterState } from '../types';

export const useMatchFilters = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);

  const fetchBrackets = async () => {
    try {
      const { data, error } = await supabase.from('brackets').select('id, title').order('title');

      if (error) throw error;
      setBrackets(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog('Error fetching brackets:', errorMessage);
    }
  };

  const setFilterDate = (date?: Date) => {
    filterLog('Setting filter date', date);
    setFilters((prev) => ({ ...prev, date }));
  };

  const setBracketFilter = (bracketId?: string) => {
    setFilters((prev) => ({ ...prev, bracketId }));
  };

  const clearFilters = () => {
    filterLog('Clearing all filters');
    setFilters({});
  };

  // New function to update filters for specific match dates
  const updateFiltersForMatchDate = (matchDate: Date) => {
    if (!filters.date || filters.date.getTime() !== matchDate.getTime()) {
      filterLog('Auto-updating filter date to match newly created match', matchDate);
      setFilterDate(matchDate);
    }
  };

  return {
    filters,
    brackets,
    fetchBrackets,
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate,
  };
};
