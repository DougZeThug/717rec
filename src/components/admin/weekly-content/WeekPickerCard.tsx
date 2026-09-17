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
      <div className="flex flex-col gap-2">
        <Label htmlFor="recap-season">Season</Label>
        <Select value={seasonId} onValueChange={onSeasonChange}>
          <SelectTrigger id="recap-season">
            <SelectValue placeholder="Pick a season" />
          </SelectTrigger>
          <SelectContent>
            {seasons.map((season) => (
              <SelectItem key={season.id} value={season.id}>
                {season.name}
                {season.is_active ? ' (active)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="recap-week">Week</Label>
        <Select value={weekNumber} onValueChange={onWeekChange}>
          <SelectTrigger id="recap-week">
            <SelectValue placeholder="Pick a week" />
          </SelectTrigger>
          <SelectContent>
            {WEEK_OPTIONS.map((week) => (
              <SelectItem key={week} value={String(week)}>
                Week {week}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
