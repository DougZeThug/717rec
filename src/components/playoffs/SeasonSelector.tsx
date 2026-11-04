import React, { useId } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSeasons } from '@/hooks/useSeasons';

interface SeasonSelectorProps {
  selectedSeasonId: string | null;
  onSeasonChange: (seasonId: string) => void;
}

const SeasonSelector: React.FC<SeasonSelectorProps> = ({ selectedSeasonId, onSeasonChange }) => {
  const { data: seasons, isLoading } = useSeasons();
  // useId gives each mounted copy its own id, so the label always points at its
  // own trigger. A fixed id would collide if this were ever mounted twice.
  const triggerId = useId();

  if (isLoading || !seasons || seasons.length <= 1) {
    return null;
  }

  // The address can name any season (?season=...). Radix shows its placeholder
  // only for an empty value, so an id that is not in the list left the trigger
  // blank. Treat an unknown id as no selection.
  const knownSelection = seasons.some((season) => season.id === selectedSeasonId)
    ? (selectedSeasonId ?? undefined)
    : undefined;

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={triggerId}
        className="text-sm font-medium text-muted-foreground whitespace-nowrap"
      >
        Season:
      </label>
      <Select value={knownSelection} onValueChange={onSeasonChange}>
        {/* On a phone the picker is 44px tall (the usual tap size) and wide enough for
            "Season name (Current)": at the old fixed 220px the "(Current)" part was
            cut off. From md up it keeps its old 220px by 40px size. */}
        <SelectTrigger
          id={triggerId}
          className="h-11 w-full max-w-[260px] bg-card border-border md:h-10 md:w-[220px] md:max-w-none"
        >
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((season) => (
            <SelectItem key={season.id} value={season.id} className="py-3 md:py-2">
              {season.name}
              {season.is_active ? ' (Current)' : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default SeasonSelector;
