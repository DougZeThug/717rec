
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import ScheduleSearch from "./ScheduleSearch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import DateStrip from "./DateStrip";

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
  matchDates = new Set()
}) => {
  const handleDateSelect = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <header className="mt-2 mb-2 font-inter">
      <div className="flex flex-col gap-3">
        {/* Top row: Title and Search */}
        <div className="flex items-center justify-between gap-4">
          <h1
            className="font-bebas text-2xl sm:text-3xl font-semibold uppercase tracking-wide text-cornhole-navy dark:text-white"
            style={{ letterSpacing: "0.07em" }}
          >
            Schedule
          </h1>
          <div className="flex items-center gap-2">
            <ScheduleSearch value={searchTerm} onChange={setSearchTerm} />
            {/* Calendar popover for jumping to any date */}
            {onDateSelect && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 h-10 w-10"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-md border border-border bg-popover" align="end">
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
        
        {/* Date Strip - swipeable horizontal date picker */}
        {onDateSelect && (
          <DateStrip
            selectedDate={selectedDate}
            onDateSelect={onDateSelect}
            matchDates={matchDates}
          />
        )}
      </div>
    </header>
  );
};

export default ScheduleHeader;
