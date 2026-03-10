import React from 'react';

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

  if (isLoading || !seasons || seasons.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Season:</label>
      <Select value={selectedSeasonId ?? undefined} onValueChange={onSeasonChange}>
        <SelectTrigger className="w-[220px] bg-card border-border">
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
