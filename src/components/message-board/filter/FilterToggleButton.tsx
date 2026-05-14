import { Filter } from 'lucide-react';
import { useTheme } from 'next-themes';
import React from 'react';

import { Button } from '@/components/ui/button';
import { FilterOptions } from '@/hooks/message-board/types';
import { cn } from '@/lib/utils';

interface FilterToggleButtonProps {
  filterOptions: FilterOptions;
  onClick: () => void;
  isActive: boolean;
}

const FilterToggleButton: React.FC<FilterToggleButtonProps> = ({
  filterOptions,
  onClick,
  isActive: _isActive,
}) => {
  const { resolvedTheme: _resolvedTheme } = useTheme();
  // Check if any filters are active
  const hasActiveFilters =
    filterOptions.category !== null ||
    filterOptions.teamId !== null ||
    filterOptions.searchQuery !== null;

  return (
    <Button
      variant={hasActiveFilters ? 'blueOrange' : 'outline'}
      size="icon"
      className={cn('flex-shrink-0 border', !hasActiveFilters && 'dark:border-gray-600')}
      onClick={onClick}
      aria-label={_isActive ? 'Hide filters' : 'Show filters'}
      aria-expanded={_isActive}
    >
      <Filter className="size-4" />
      {hasActiveFilters && (
        <span
          className={cn(
            'absolute -top-1 -right-1 rounded-full size-4 text-[10px] flex items-center justify-center bg-white text-blue-600'
          )}
        >
          {Object.values(filterOptions).filter(Boolean).length}
        </span>
      )}
    </Button>
  );
};

export default FilterToggleButton;
