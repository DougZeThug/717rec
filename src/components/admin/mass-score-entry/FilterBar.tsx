
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Filter } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterState } from "./types";

interface FilterBarProps {
  filters: FilterState;
  brackets: { id: string; title: string }[];
  onDateChange: (date?: Date) => void;
  onBracketChange: (bracketId?: string) => void;
  onClearFilters: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  brackets,
  onDateChange,
  onBracketChange,
  onClearFilters
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-1 h-9">
              <CalendarIcon size={16} />
              {filters.date ? format(filters.date, "MMM d, yyyy") : "Filter by Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={onDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={filters.bracketId} onValueChange={onBracketChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Filter by Bracket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={undefined}>All Brackets</SelectItem>
            {brackets.map(bracket => (
              <SelectItem key={bracket.id} value={bracket.id}>
                {bracket.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9" onClick={onClearFilters}>
          <Filter size={16} className="mr-1" />
          Clear Filters
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;
