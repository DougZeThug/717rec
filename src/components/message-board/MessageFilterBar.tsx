
import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { MESSAGE_CATEGORIES } from "@/types/reactions";

interface FilterOptions {
  category: string;
}

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
  isRefreshing
}) => {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select
          value={filterOptions.category}
          onValueChange={(value) => onFilterChange({ category: value })}
        >
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {MESSAGE_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className={cn("h-8 px-2")}
      >
        <RefreshCw 
          className={cn(
            "h-4 w-4", 
            isRefreshing && "animate-spin"
          )} 
        />
        <span className="ml-1 text-xs">Refresh</span>
      </Button>
    </div>
  );
};

export default MessageFilterBar;
