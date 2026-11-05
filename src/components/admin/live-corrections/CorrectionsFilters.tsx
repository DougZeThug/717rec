import React from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { formatLeagueNight } from './leagueNight';

export const ALL_SEASONS = '__all__';
export const ALL_DATES = '__all__';

interface CorrectionsFiltersProps {
  seasons: Array<{ id: string; name: string; is_archived?: boolean | null }>;
  seasonId: string;
  onSeasonChange: (value: string) => void;
  /** `leagueNightKey` values present in the loaded list, most recent first. */
  nights: string[];
  night: string;
  onNightChange: (value: string) => void;
}

/**
 * Season and night pickers for the corrections list.
 *
 * The night options are the nights actually present in the loaded matches, so
 * neither picker can offer a combination with nothing behind it.
 */
const CorrectionsFilters: React.FC<CorrectionsFiltersProps> = ({
  seasons,
  seasonId,
  onSeasonChange,
  nights,
  night,
  onNightChange,
}) => (
  <div className="flex flex-wrap gap-3">
    <div className="flex min-w-[200px] flex-1 flex-col gap-1.5 md:max-w-[240px]">
      <label htmlFor="season-filter" className="text-sm font-medium">
        Season
      </label>
      <Select value={seasonId} onValueChange={onSeasonChange}>
        <SelectTrigger id="season-filter" className="min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SEASONS}>All seasons</SelectItem>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.is_archived ? `${s.name} (archived — read-only)` : s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="flex min-w-[200px] flex-1 flex-col gap-1.5 md:max-w-[240px]">
      <label htmlFor="night-filter" className="text-sm font-medium">
        Night
      </label>
      <Select value={night} onValueChange={onNightChange}>
        <SelectTrigger id="night-filter" className="min-h-[44px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_DATES}>All nights</SelectItem>
          {nights.map((key) => (
            <SelectItem key={key} value={key}>
              {formatLeagueNight(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
);

export default CorrectionsFilters;
