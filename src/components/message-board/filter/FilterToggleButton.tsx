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
  isActive,
}) => {
  const { resolvedTheme } = useTheme();
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
    >
      <Filter className="h-4 w-4" />
      {hasActiveFilters && (
        <span
          className={cn(
            'absolute -top-1 -right-1 rounded-full w-4 h-4 text-[10px] flex items-center justify-center bg-white text-blue-600'
          )}
        >
          {Object.values(filterOptions).filter(Boolean).length}
        </span>
      )}
    </Button>
  );
};

export default FilterToggleButton;
