import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from 'date-fns';
import React, { useEffect, useRef } from 'react';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useScrollBehavior } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

const DAYS_BEFORE_TODAY = 3;
const DAYS_AFTER_TODAY = 10;
/** Cap on how far the strip stretches before it re-centres on the selection. */
const MAX_STRIP_DAYS = 45;

interface DateStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  matchDates: Set<string>;
}

const DateStrip: React.FC<DateStripProps> = ({ selectedDate, onDateSelect, matchDates }) => {
  const scrollBehavior = useScrollBehavior();
  const selectedRef = useRef<HTMLButtonElement>(null);

  // 14 days around today: past 3 days + today + next 10. The window stretches to
  // include the selected date, because the page can open on the last night that
  // was played, which may be further back than three days. Without this the
  // selected day would simply not be in the strip. See UX audit SC-01.
  const dates = React.useMemo(() => {
    const today = startOfDay(new Date());
    const selected = startOfDay(selectedDate);

    let start = addDays(today, -DAYS_BEFORE_TODAY);
    let end = addDays(today, DAYS_AFTER_TODAY);

    if (selected < start) start = selected;
    if (selected > end) end = selected;

    // A date picked months away must not render hundreds of buttons; centre the
    // usual window on it instead.
    if (differenceInCalendarDays(end, start) > MAX_STRIP_DAYS) {
      start = addDays(selected, -DAYS_BEFORE_TODAY);
      end = addDays(selected, DAYS_AFTER_TODAY);
    }

    const result: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) {
      result.push(day);
    }
    return result;
  }, [selectedDate]);

  useEffect(() => {
    if (selectedRef.current) {
      const element = selectedRef.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.scrollIntoView({
            behavior: scrollBehavior,
            block: 'nearest',
            inline: 'center',
          });
        });
      });
    }
  }, [scrollBehavior, selectedDate]);

  const hasMatchesOnDate = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return matchDates.has(dateStr);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-1 py-1 px-0.5">
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isTodayDate = isToday(date);
          const hasMatches = hasMatchesOnDate(date);

          return (
            <button
              type="button"
              key={date.toISOString()}
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
                    'size-1.5 rounded-full mt-0.5',
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
