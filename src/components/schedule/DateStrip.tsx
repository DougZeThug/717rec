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
      <div className="flex gap-1 py-1 px-0.5">
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
                'flex flex-col items-center px-3 py-1.5 rounded-xl min-w-[50px] transition-all duration-200',
                'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50',
                isSelected &&
                  'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105',
                isTodayDate && !isSelected && 'ring-1 ring-primary/60',
                !isSelected && 'bg-card'
              )}
            >
              <span
                className={cn(
                  'text-[10px] font-semibold uppercase tracking-wider',
                  isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                )}
              >
                {format(date, 'EEE')}
              </span>
              <span
                className={cn(
                  'font-black tabular-nums',
                  isSelected ? 'text-xl text-primary-foreground' : 'text-lg text-foreground'
                )}
              >
                {format(date, 'd')}
              </span>
              {hasMatches && (
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-0.5',
                    isSelected ? 'bg-primary-foreground' : 'bg-orange-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="h-1.5" />
    </ScrollArea>
  );
};

export default DateStrip;
