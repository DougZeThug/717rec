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

const FilterSection: React.FC<FilterSectionProps> = ({
  filterOptions,
  onFilterChange,
  onClearFilters,
}) => {
  const { teams } = useTeams();

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
          <Select value={filterOptions.category || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger>
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
        </div>

        {/* Team Filter */}
        <div className="w-full sm:w-auto flex-1">
          <Select value={filterOptions.teamId || 'all'} onValueChange={handleTeamChange}>
            <SelectTrigger>
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
        </div>

        {/* Clear Filters button */}
        <Button variant="ghost" size="sm" onClick={onClearFilters} className="ml-auto">
          <X className="h-3.5 w-3.5 mr-1" />
          Clear filters
        </Button>
      </div>
    </div>
  );
};

export default FilterSection;
