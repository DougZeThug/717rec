import { X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterOptions } from '@/hooks/message-board/types';
import { useTeams } from '@/hooks/useTeams';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { MESSAGE_CATEGORIES, MessageCategory } from '@/types/reactions';

interface FilterSectionProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: Partial<FilterOptions>) => void;
  onClearFilters: () => void;
}

type FilterSelectProps<T> = { value: T; onChange: (value: string) => void };

const CategoryFilter: React.FC<FilterSelectProps<FilterOptions['category']>> = ({
  value,
  onChange,
}) => (
  <Select value={value || 'all'} onValueChange={onChange}>
    <SelectTrigger aria-label="Filter by category">
      <SelectValue placeholder="Category" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectItem value="all">All Categories</SelectItem>
        {MESSAGE_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectGroup>
    </SelectContent>
  </Select>
);

const TeamFilter: React.FC<FilterSelectProps<FilterOptions['teamId']>> = ({ value, onChange }) => {
  const { teams } = useTeams();

  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger aria-label="Filter by team">
        <SelectValue placeholder="Team" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Teams</SelectItem>
        {teams?.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

const FilterSection: React.FC<FilterSectionProps> = ({
  filterOptions,
  onFilterChange,
  onClearFilters,
}) => {
  const handleCategoryChange = (value: string) => {
    onFilterChange({ category: value === 'all' ? null : (value as MessageCategory) });
  };

  const handleTeamChange = (value: string) => {
    onFilterChange({ teamId: value === 'all' ? null : value });
  };

  return (
    <div className={cn('space-y-2', animations.fadeIn)}>
      <div className="flex flex-wrap gap-2">
        {/* Category Filter */}
        <div className="w-full sm:w-auto flex-1">
          <CategoryFilter value={filterOptions.category} onChange={handleCategoryChange} />
        </div>

        {/* Team Filter */}
        <div className="w-full sm:w-auto flex-1">
          <TeamFilter value={filterOptions.teamId} onChange={handleTeamChange} />
        </div>

        {/* Clear Filters button */}
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto">
          <X className="size-3.5 mr-1" />
          Clear filters
        </Button>
      </div>
    </div>
  );
};

export default FilterSection;
