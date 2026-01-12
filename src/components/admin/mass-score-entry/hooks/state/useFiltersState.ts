import { useState } from 'react';

import { fetchBracketsForSelector } from '@/services/brackets/BracketReadService';
import { errorLog, filterLog } from '@/utils/logger';

import { FilterState } from '../../types';

export const useFiltersState = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const [brackets, setBrackets] = useState<{ id: string; title: string }[]>([]);

  const fetchBrackets = async () => {
    try {
      const data = await fetchBracketsForSelector();
      setBrackets(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorLog('Error fetching brackets:', message);
    }
  };

  const setFilterDate = (date?: Date) => {
    filterLog('Setting filter date:', date);
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
      filterLog('Auto-updating filter date to match newly created match:', matchDate);
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
