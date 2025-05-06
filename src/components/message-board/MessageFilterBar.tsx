
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, Search, X, RefreshCw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { animations, gradients } from "@/styles/designSystem";
import { MESSAGE_CATEGORIES, MessageCategory } from "@/types/reactions";
import { FilterOptions } from "@/hooks/message-board/types";
import { Badge } from "@/components/ui/badge";
import { useTeams } from "@/hooks/useTeams";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  const [searchInput, setSearchInput] = useState(filterOptions.searchQuery || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ searchQuery: searchInput || null });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({ category: value === "all" ? null : value as MessageCategory });
  };

  const handleTeamChange = (value: string) => {
    onFilterChange({ teamId: value === "all" ? null : value });
  };

  const clearFilters = () => {
    setSearchInput("");
    onFilterChange({
      category: null,
      teamId: null,
      searchQuery: null,
    });
    setIsFilterOpen(false);
  };

  // Check if any filters are active
  const hasActiveFilters =
    filterOptions.category !== null ||
    filterOptions.teamId !== null ||
    filterOptions.searchQuery !== null;

  return (
    <div className={cn("space-y-2", animations.fadeIn)}>
      {/* Search Bar with Inline Refresh Button */}
      <div className="flex gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Input
            type="search"
            placeholder="Search messages..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pr-10"
          />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
        </form>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex-shrink-0"
          aria-label="Refresh messages"
        >
          <RefreshCw 
            className={cn("h-4 w-4", isRefreshing && "animate-spin")} 
          />
        </Button>
        
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "flex-shrink-0",
            hasActiveFilters && "border-primary text-primary"
          )}
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
        >
          <Filter className="h-4 w-4" />
          {hasActiveFilters && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {Object.values(filterOptions).filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Advanced Filters (Collapsible) */}
      <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
        <CollapsibleContent className={cn("space-y-2", animations.fadeIn)}>
          <div className="flex flex-wrap gap-2">
            {/* Category Filter */}
            <div className="w-full sm:w-auto flex-1">
              <Select
                value={filterOptions.category || "all"}
                onValueChange={handleCategoryChange}
              >
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
              <Select
                value={filterOptions.teamId || "all"}
                onValueChange={handleTeamChange}
              >
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
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear filters
            </Button>
          </div>
          
          {/* Active Filters Display - Only show when there are active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1 mt-1">
              {filterOptions.category && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-xs"
                >
                  <Tag className="h-3 w-3" />
                  {filterOptions.category}
                  <X
                    className="h-3 w-3 ml-0.5 cursor-pointer"
                    onClick={() => onFilterChange({ category: null })}
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
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default MessageFilterBar;
