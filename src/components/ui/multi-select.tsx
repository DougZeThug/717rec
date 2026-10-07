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

const SelectIndicators: React.FC<{
  hasSelection: boolean;
  onClear: (e: React.MouseEvent) => void;
}> = ({ hasSelection, onClear }) => (
  <div className="flex items-center gap-2">
    {hasSelection && (
      <X className="size-4 shrink-0 opacity-50 hover:opacity-100" onClick={onClear} />
    )}
    <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
  </div>
);

const OptionsCommand: React.FC<{
  options: MultiSelectOption[];
  selected: string[];
  onSelect: (value: string) => void;
}> = ({ options, selected, onSelect }) => (
  <Command>
    <CommandInput placeholder="Search teams..." aria-label="Search teams" />
    <CommandList>
      <CommandEmpty>No teams found.</CommandEmpty>
      <CommandGroup className="max-h-64 overflow-auto">
        {options.map((option) => (
          <CommandItem
            key={option.value}
            value={option.label}
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

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
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
          <SelectIndicators hasSelection={selected.length > 0} onClear={handleClear} />
        </Button>
      </PopoverTrigger>
      <PopoverContent id={listboxId} className="w-full p-0" align="start">
        <OptionsCommand options={options} selected={selected} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
