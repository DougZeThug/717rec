import { Info } from 'lucide-react';
import React from 'react';

import { PowerScoreExplainer } from '@/components/stats/PowerScoreExplainer';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  getPowerScoreColor,
  getPowerScoreDescription,
  POWER_SCORE_BAND_FLOORS,
} from '@/utils/colors/powerScoreColors';

/** "85 and above", "70-84", ... "under 20", read off the shared band floors. */
const bandRange = (index: number): string => {
  const floor = POWER_SCORE_BAND_FLOORS[index];
  const ceiling = POWER_SCORE_BAND_FLOORS[index - 1];

  if (ceiling === undefined) return `${floor} and above`;
  if (floor === 0) return `under ${ceiling}`;
  return `${floor}–${ceiling - 1}`;
};

/**
 * Explains the central number on the standings before a visitor has to leave
 * for the help page, and gives the colour of a power score a text equivalent.
 */
export const PowerScoreInfoPopover: React.FC = () => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="What is Power Score?"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <Info aria-hidden="true" />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      className="w-80 max-w-[calc(100vw-2rem)] space-y-3 text-sm font-inter"
    >
      <h3 className="font-bebas text-base uppercase tracking-wide">How teams are rated</h3>
      <PowerScoreExplainer />
      <div>
        <h4 className="font-semibold">What the Power colours mean</h4>
        <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
          {POWER_SCORE_BAND_FLOORS.map((floor, index) => (
            <li key={floor} className="flex flex-col leading-tight">
              <span className={cn('font-semibold tabular-nums', getPowerScoreColor(floor))}>
                {bandRange(index)}
              </span>
              <span className="text-xs text-muted-foreground">
                {getPowerScoreDescription(floor)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PopoverContent>
  </Popover>
);
