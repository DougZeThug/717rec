
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
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date ? format(filters.date, "MMM d, yyyy") : "Filter by Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={onDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Select value={filters.bracketId} onValueChange={onBracketChange}>
          <SelectTrigger className="w-full">
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
      </div>

      <Button 
        variant="ghost" 
        onClick={onClearFilters}
        className="w-full sm:w-auto justify-center"
      >
        <Filter className="mr-2 h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  );
};

export default FilterBar;
