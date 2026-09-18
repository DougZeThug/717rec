import { Loader2, Sparkles } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Weeks to offer. A season never runs longer than this in practice. */
const WEEK_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

interface WeekPickerCardProps {
  seasons: Array<{ id: string; name: string; is_active: boolean }>;
  seasonId: string;
  weekNumber: string;
  isGenerating: boolean;
  onSeasonChange: (seasonId: string) => void;
  onWeekChange: (week: string) => void;
  onGenerate: () => void;
}

/**
 * A labelled dropdown. The season and week pickers were the same markup twice,
 * five levels deep inside the card; one component says it once and keeps the
 * card itself readable.
 */
const PickerField: React.FC<{
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}> = ({ id, label, value, placeholder, options, onChange }) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

const WeekPickerCard: React.FC<WeekPickerCardProps> = ({
  seasons,
  seasonId,
  weekNumber,
  isGenerating,
  onSeasonChange,
  onWeekChange,
  onGenerate,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Choose a week</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-4">
      <PickerField
        id="recap-season"
        label="Season"
        value={seasonId}
        placeholder="Pick a season"
        onChange={onSeasonChange}
        options={seasons.map((season) => ({
          value: season.id,
          label: `${season.name}${season.is_active ? ' (active)' : ''}`,
        }))}
      />

      <PickerField
        id="recap-week"
        label="Week"
        value={weekNumber}
        placeholder="Pick a week"
        onChange={onWeekChange}
        options={WEEK_OPTIONS.map((week) => ({ value: String(week), label: `Week ${week}` }))}
      />

      <Button onClick={onGenerate} disabled={!seasonId || !weekNumber || isGenerating}>
        {isGenerating ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        Generate draft
      </Button>
    </CardContent>
  </Card>
);

export default WeekPickerCard;
