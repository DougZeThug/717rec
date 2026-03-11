import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CalendarIcon, Info, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { FilterState } from './types';

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
  onClearFilters,
}) => {
  const hasActiveFilters = filters.date || filters.bracketId;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start min-h-[44px] transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:text-gray-200"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.date ? format(filters.date, 'MMM d, yyyy') : 'Filter by Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.date}
              onSelect={onDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Select
          value={filters.bracketId || undefined}
          onValueChange={(value) => onBracketChange(value || undefined)}
        >
          <SelectTrigger className="w-full min-h-[44px] dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:text-gray-200">
            <SelectValue placeholder="Filter by Bracket" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brackets</SelectItem>
            {brackets.map((bracket) => (
              <SelectItem key={bracket.id} value={bracket.id}>
                {bracket.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.date && (
        <div className="flex items-center text-xs text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  <span>Showing matches for the entire session (including evening games)</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  This view includes evening matches that might be stored with next-day UTC dates
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {hasActiveFilters ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="self-start"
        >
          <Button
            variant="ghost"
            onClick={onClearFilters}
            size="sm"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-200 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-3 w-3" />
            Clear All Filters
          </Button>
        </motion.div>
      ) : (
        <div className="h-6" /> // Spacer to keep layout consistent
      )}
    </div>
  );
};

export default FilterBar;
