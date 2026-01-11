import { Tag, X } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { FilterOptions } from '@/hooks/message-board/types';
import { cn } from '@/lib/utils';

interface ActiveFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: Partial<FilterOptions>) => void;
  teams?: Array<{ id: string; name: string }>;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({ filterOptions, onFilterChange, teams }) => {
  // Only show when there are active filters
  const hasActiveFilters =
    filterOptions.category !== null ||
    filterOptions.teamId !== null ||
    filterOptions.searchQuery !== null;

  if (!hasActiveFilters) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {filterOptions.category && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          <Tag className="h-3 w-3" />
          {filterOptions.category}
          <button
            type="button"
            onClick={() => onFilterChange({ category: null })}
            className="ml-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Remove category filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filterOptions.teamId && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          Team: {teams?.find((t) => t.id === filterOptions.teamId)?.name || 'Unknown'}
          <button
            type="button"
            onClick={() => onFilterChange({ teamId: null })}
            className="ml-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Remove team filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {filterOptions.searchQuery && (
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          "{filterOptions.searchQuery}"
          <button
            type="button"
            onClick={() => onFilterChange({ searchQuery: null })}
            className="ml-0.5 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Remove search filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  );
};

export default ActiveFilters;
