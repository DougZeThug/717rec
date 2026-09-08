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
        {/* The band's colour is a swatch, not the text: several of these
            colours sit near 3:1 on a light card, which is fine for a graphic
            but under the 4.5:1 text minimum. The words stay readable. */}
        <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {POWER_SCORE_BAND_FLOORS.map((floor, index) => (
            <li key={floor} className="flex items-start gap-1.5 leading-tight">
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1 size-2.5 shrink-0 rounded-full bg-current',
                  getPowerScoreColor(floor)
                )}
              />
              <span className="flex flex-col">
                <span className="font-semibold tabular-nums text-foreground">
                  {bandRange(index)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getPowerScoreDescription(floor)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </PopoverContent>
  </Popover>
);
