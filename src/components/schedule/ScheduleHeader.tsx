import { Calendar } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import DateStrip from './DateStrip';
import ScheduleSearch from './ScheduleSearch';

interface ScheduleHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNewMatch?: () => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  matchDates?: Set<string>;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  selectedDate = new Date(),
  onDateSelect,
  matchDates = new Set(),
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <header className="mt-1 mb-1 font-inter">
      <div className="flex flex-col gap-2">
        {/* Date Strip - swipeable horizontal date picker */}
        {onDateSelect && (
          <DateStrip
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            matchDates={matchDates}
          />
        )}

        {/* Search + Calendar row */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ScheduleSearch value={searchTerm} onChange={setSearchTerm} />
          </div>
          {onDateSelect && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 h-9 w-9">
                  <Calendar className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 shadow-md border border-border bg-popover"
                align="end"
              >
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </header>
  );
};

export default ScheduleHeader;
