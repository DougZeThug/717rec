import { format } from 'date-fns';
import { m } from 'framer-motion';
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

interface DateFilterProps {
  date: FilterState['date'];
  onDateChange: (date?: Date) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ date, onDateChange }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className="w-full justify-start min-h-[44px] transition-colors duration-200 hover:bg-accent"
      >
        <CalendarIcon className="mr-2 size-4" />
        {date ? format(date, 'MMM d, yyyy') : 'Filter by Date'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={date}
        onSelect={onDateChange}
        className="p-3 pointer-events-auto"
      />
    </PopoverContent>
  </Popover>
);

const SessionDateHintLabel: React.FC = () => (
  <div className="flex items-center">
    <Info className="size-3 mr-1" />
    <span>Showing matches for the entire session (including evening games)</span>
  </div>
);

const SessionDateHint: React.FC = () => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <SessionDateHintLabel />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs">
          This view includes evening matches that might be stored with next-day UTC dates
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface BracketFilterProps {
  bracketId: FilterState['bracketId'];
  brackets: FilterBarProps['brackets'];
  onBracketChange: (bracketId?: string) => void;
}

const BracketFilter: React.FC<BracketFilterProps> = ({ bracketId, brackets, onBracketChange }) => (
  <Select
    value={bracketId || undefined}
    onValueChange={(value) => onBracketChange(value === 'all' ? undefined : value)}
  >
    <SelectTrigger aria-label="Filter by bracket" className="w-full min-h-[44px] hover:bg-accent">
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
);

/** Renders date and bracket filters for the mass score entry workflow. */
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
        <DateFilter date={filters.date} onDateChange={onDateChange} />

        <BracketFilter
          bracketId={filters.bracketId}
          brackets={brackets}
          onBracketChange={onBracketChange}
        />
      </div>

      {filters.date && (
        <div className="flex items-center text-xs text-muted-foreground">
          <SessionDateHint />
        </div>
      )}

      {hasActiveFilters ? (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="self-start"
        >
          <Button
            variant="ghost"
            onClick={onClearFilters}
            size="sm"
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <X className="size-3" />
            Clear All Filters
          </Button>
        </m.div>
      ) : (
        <div className="h-6" /> // Spacer to keep layout consistent
      )}
    </div>
  );
};

export default FilterBar;
