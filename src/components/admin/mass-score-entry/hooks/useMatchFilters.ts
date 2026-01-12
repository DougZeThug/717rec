import { useState } from 'react';

import { useBracketsQuery } from '@/hooks/brackets/useBracketsQuery';
import { filterLog } from '@/utils/logger';

import { FilterState } from '../types';

export const useMatchFilters = () => {
  const [filters, setFilters] = useState<FilterState>({});
  const { brackets } = useBracketsQuery();

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
    setFilterDate,
    setBracketFilter,
    clearFilters,
    updateFiltersForMatchDate,
  };
};
