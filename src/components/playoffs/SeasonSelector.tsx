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
  // The Playoffs page mounts this twice (desktop and the phone bar). A fixed id
  // made the phone label point at the hidden desktop copy.
  const triggerId = useId();

  if (isLoading || !seasons || seasons.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor={triggerId}
        className="text-sm font-medium text-muted-foreground whitespace-nowrap"
      >
        Season:
      </label>
      <Select value={selectedSeasonId ?? undefined} onValueChange={onSeasonChange}>
        <SelectTrigger id={triggerId} className="w-[220px] bg-card border-border">
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((season) => (
            <SelectItem key={season.id} value={season.id}>
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
