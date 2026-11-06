import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { normalizeDate } from '@/utils/dateNormalization';
import { timezoneLog } from '@/utils/logger';

interface ThursdayDatePickerProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

const isThursday = (date: Date) => {
  return date.getDay() === 4; // 4 represents Thursday (0 = Sunday, 1 = Monday, etc.)
};

interface ThursdayPopoverProps {
  selected: Date | null;
  onSelect: (date: Date | undefined) => void;
}

const ThursdayPopover = ({ selected, onSelect }: ThursdayPopoverProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        className={cn(
          // 240px, but never wider than the card (it was cut off at 320px). The small
          // (yyyy-mm-dd) copy of the date needs about 283px, so it shows, and the button grows
          // to fit it, only from 440px up. Below that it stuck out of the button's border.
          'w-[240px] max-w-full min-[440px]:w-fit min-[440px]:min-w-[240px] justify-start text-left font-normal',
          !selected && 'text-muted-foreground'
        )}
      >
        <CalendarIcon className="mr-2 size-4" />
        {selected ? (
          <span>
            {format(selected, 'PPP')}
            <span className="ml-1 hidden text-xs opacity-50 min-[440px]:inline">
              ({normalizeDate(selected, 'display')})
            </span>
          </span>
        ) : (
          <span>Pick a Thursday</span>
        )}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={selected ?? undefined}
        onSelect={onSelect}
        disabled={(date) => !isThursday(date)}
      />
    </PopoverContent>
  </Popover>
);

export const ThursdayDatePicker = ({ selected, onSelect }: ThursdayDatePickerProps) => {
  // Enhanced handler to ensure consistent date handling
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onSelect(null);
      return;
    }

    timezoneLog('ThursdayDatePicker - Date selected:', {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      normalizedDate: normalizeDate(date, 'ThursdayDatePicker'),
    });

    // Create a new Date object at noon to avoid timezone issues
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);

    onSelect(safeDate);
  };

  return (
    <div className="flex flex-col space-y-2">
      <ThursdayPopover selected={selected} onSelect={handleDateSelect} />
    </div>
  );
};
