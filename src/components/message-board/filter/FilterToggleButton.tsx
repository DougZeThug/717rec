
import React from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterOptions } from "@/hooks/message-board/types";

interface FilterToggleButtonProps {
  filterOptions: FilterOptions;
  onClick: () => void;
  isActive: boolean;
}

const FilterToggleButton: React.FC<FilterToggleButtonProps> = ({
  filterOptions,
  onClick,
  isActive
}) => {
  // Check if any filters are active
  const hasActiveFilters =
    filterOptions.category !== null ||
    filterOptions.teamId !== null ||
    filterOptions.searchQuery !== null;
    
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "flex-shrink-0",
        hasActiveFilters && "border-primary text-primary"
      )}
      onClick={onClick}
    >
      <Filter className="h-4 w-4" />
      {hasActiveFilters && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
          {Object.values(filterOptions).filter(Boolean).length}
        </span>
      )}
    </Button>
  );
};

export default FilterToggleButton;
