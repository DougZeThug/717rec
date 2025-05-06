
import React from "react";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterOptions } from "@/hooks/message-board/types";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
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
        "flex-shrink-0 border dark:border-gray-600",
        hasActiveFilters && resolvedTheme === "dark" 
          ? "border-blue-500 text-blue-400" 
          : hasActiveFilters 
          ? "border-primary text-primary"
          : ""
      )}
      onClick={onClick}
    >
      <Filter className="h-4 w-4" />
      {hasActiveFilters && (
        <span className={cn(
          "absolute -top-1 -right-1 rounded-full w-4 h-4 text-[10px] flex items-center justify-center",
          resolvedTheme === "dark" ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"
        )}>
          {Object.values(filterOptions).filter(Boolean).length}
        </span>
      )}
    </Button>
  );
};

export default FilterToggleButton;
