
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, Search, X, Tag } from "lucide-react";
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

interface MessageFilterBarProps {
  filterOptions: FilterOptions;
  onFilterChange: (filter: Partial<FilterOptions>) => void;
}

const MessageFilterBar: React.FC<MessageFilterBarProps> = ({
  filterOptions,
  onFilterChange,
}) => {
  const { teams } = useTeams();
  const [searchInput, setSearchInput] = useState(filterOptions.searchQuery || "");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ searchQuery: searchInput || null });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({ category: value as MessageCategory });
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
    <div className={cn("space-y-3", animations.fadeIn)}>
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
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

      {/* Filter Controls */}
      <div className="flex items-center justify-between">
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-1",
                hasActiveFilters && "border-primary text-primary"
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 px-1">
                  {Object.values(filterOptions).filter(Boolean).length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-4 p-1">
              <h4 className="font-medium text-sm">Filters</h4>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Category
                </label>
                <Select
                  value={filterOptions.category || "all"}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
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
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Team
                </label>
                <Select
                  value={filterOptions.teamId || "all"}
                  onValueChange={handleTeamChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select team" />
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

              {/* Clear Filters Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear filters
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1">
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
      </div>
    </div>
  );
};

export default MessageFilterBar;
