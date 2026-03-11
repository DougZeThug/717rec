import React, { useState } from 'react';

import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { FilterOptions } from '@/hooks/message-board/types';
import { useTeams } from '@/hooks/useTeams';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';

import ActiveFilters from './filter/ActiveFilters';
import FilterSection from './filter/FilterSection';
import FilterToggleButton from './filter/FilterToggleButton';
// Import our newly created components
import SearchBar from './filter/SearchBar';

interface MessageFilterBarProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: Partial<FilterOptions>) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const MessageFilterBar: React.FC<MessageFilterBarProps> = ({
  filterOptions,
  onFilterChange,
  onRefresh,
  isRefreshing,
}) => {
  const { teams } = useTeams();
  const [searchInput, setSearchInput] = useState(filterOptions.searchQuery || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ searchQuery: searchInput || null });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFilterChange({
      category: null,
      teamId: null,
      searchQuery: null,
    });
    setShowAdvancedFilters(false);
  };

  return (
    <div className={cn('space-y-2', animations.fadeIn)}>
      {/* Search Bar with Inline Refresh Button */}
      <div className="flex gap-2">
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          onSearchSubmit={handleSearchSubmit}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
        />

        <FilterToggleButton
          filterOptions={filterOptions}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          isActive={showAdvancedFilters}
        />
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent className={cn('space-y-2', animations.fadeIn)}>
          <FilterSection
            filterOptions={filterOptions}
            onFilterChange={onFilterChange}
            onClearFilters={clearFilters}
          />

          <ActiveFilters
            filterOptions={filterOptions}
            onFilterChange={onFilterChange}
            teams={teams}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MessageFilterBar;
