import { addDays, format, isSameDay, isToday } from 'date-fns';
import React, { useEffect, useRef } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DateStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  matchDates: Set<string>;
}

const DateStrip: React.FC<DateStripProps> = ({ selectedDate, onDateSelect, matchDates }) => {
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Generate 14 days: past 3 days + today + next 10 days
  const dates = React.useMemo(() => {
    const result: Date[] = [];
    const today = new Date();

    for (let i = -3; i <= 10; i++) {
      result.push(addDays(today, i));
    }

    return result;
  }, []);

  // Auto-scroll to selected date on mount
  // Use double requestAnimationFrame to prevent forced reflow
  useEffect(() => {
    if (selectedRef.current) {
      const element = selectedRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        });
      });
    }
  }, []);

  const hasMatchesOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return matchDates.has(dateStr);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1.5 py-2 px-1">
        {dates.map((date, index) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const hasMatches = hasMatchesOnDate(date);

          return (
            <button
              key={index}
              ref={isSelected ? selectedRef : null}
              onClick={() => onDateSelect(date)}
              className={cn(
                'flex flex-col items-center px-3 py-2 rounded-lg min-w-[52px] transition-all',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
                isSelected && 'bg-primary text-primary-foreground shadow-md',
                isTodayDate && !isSelected && 'ring-1 ring-primary',
                !isSelected && 'bg-card'
              )}
            >
              <span
                className={cn(
                  'text-xs font-medium uppercase',
                  isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {format(date, 'EEE')}
              </span>
              <span
                className={cn(
                  'text-lg font-bold',
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                )}
              >
                {format(date, 'd')}
              </span>
              {hasMatches && (
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1',
                    isSelected ? 'bg-primary-foreground' : 'bg-orange-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-2" />
    </ScrollArea>
  );
};

export default DateStrip;
