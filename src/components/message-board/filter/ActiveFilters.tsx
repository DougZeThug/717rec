
import React from "react";
import { X, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FilterOptions } from "@/hooks/message-board/types";

interface ActiveFiltersProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: Partial<FilterOptions>) => void;
  teams?: Array<{id: string, name: string}>;
}

const ActiveFilters: React.FC<ActiveFiltersProps> = ({
  filterOptions,
  onFilterChange,
  teams
}) => {
  // Only show when there are active filters
  const hasActiveFilters =
    filterOptions.category !== 'All' ||
    filterOptions.teamId !== null ||
    filterOptions.searchQuery !== null;
    
  if (!hasActiveFilters) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {filterOptions.category && filterOptions.category !== 'All' && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-xs"
        >
          <Tag className="h-3 w-3" />
          {filterOptions.category}
          <X
            className="h-3 w-3 ml-0.5 cursor-pointer"
            onClick={() => onFilterChange({ category: 'All' })}
          />
        </Badge>
      )}
      {filterOptions.teamId && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-xs"
        >
          Team: {teams?.find(t => t.id === filterOptions.teamId)?.name || "Unknown"}
          <X
            className="h-3 w-3 ml-0.5 cursor-pointer"
            onClick={() => onFilterChange({ teamId: null })}
          />
        </Badge>
      )}
      {filterOptions.searchQuery && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-xs"
        >
          "{filterOptions.searchQuery}"
          <X
            className="h-3 w-3 ml-0.5 cursor-pointer"
            onClick={() => onFilterChange({ searchQuery: null })}
          />
        </Badge>
      )}
    </div>
  );
};

export default ActiveFilters;
