import { defaultFilter } from 'cmdk';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

const SelectionSummary: React.FC<{ selected: string[]; placeholder: string }> = ({
  selected,
  placeholder,
}) => (
  <div className="flex gap-1 flex-wrap">
    {selected.length === 0 ? (
      <span className="text-muted-foreground">{placeholder}</span>
    ) : (
      <span className="text-sm">
        {selected.length} team{selected.length > 1 ? 's' : ''} selected
      </span>
    )}
  </div>
);

/**
 * cmdk tells rows apart by `value`, so that has to be the unique id: team names
 * are not unique, and two rows with one name could not both be reached from
 * the keyboard. The id is not something a person searches for, so search reads
 * the label only (passed as a keyword), with cmdk's usual fuzzy match.
 */
const filterByLabel = (_value: string, search: string, keywords?: string[]): number =>
  defaultFilter(keywords?.join(' ') ?? '', search);

const OptionsCommand: React.FC<{
  options: MultiSelectOption[];
  selected: string[];
  onSelect: (value: string) => void;
}> = ({ options, selected, onSelect }) => (
  <Command filter={filterByLabel}>
    <CommandInput placeholder="Search teams..." aria-label="Search teams" />
    <CommandList>
      <CommandEmpty>No teams found.</CommandEmpty>
      <CommandGroup className="max-h-64 overflow-auto">
        {options.map((option) => (
          <CommandItem
            key={option.value}
            value={option.value}
            keywords={[option.label]}
            onSelect={() => onSelect(option.value)}
          >
            <Check
              className={cn(
                'mr-2 size-4',
                selected.includes(option.value) ? 'opacity-100' : 'opacity-0'
              )}
            />
            {option.label}
          </CommandItem>
        ))}
      </CommandGroup>
    </CommandList>
  </Command>
);

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((id) => id !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            className={cn('w-full justify-between', className)}
          >
            <SelectionSummary selected={selected} placeholder={placeholder} />
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent id={listboxId} className="w-full p-0" align="start">
          <OptionsCommand options={options} selected={selected} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
      {/* A sibling of the trigger, not a child: a button inside a button is invalid. */}
      {selected.length > 0 && (
        <button
          type="button"
          aria-label="Clear selection"
          onClick={() => onChange([])}
          className="absolute right-9 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm opacity-50 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
