
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import ScheduleSearch from "./ScheduleSearch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { useTheme } from "next-themes";

interface ScheduleHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onNewMatch?: () => void; // now optional, function removed from UI
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  selectedDate = new Date(),
  onDateSelect
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date && onDateSelect) {
      onDateSelect(date);
    }
  };

  return (
    <header className="mt-2 mb-2 font-inter">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-4 w-full">
          {/* Main Title */}
          <h1
            className="font-oswald text-2xl sm:text-3xl font-semibold uppercase tracking-wide text-cornhole-navy dark:text-white"
            style={{ letterSpacing: "0.07em" }}
          >
            Schedule
          </h1>
          {/* Date Picker */}
          {onDateSelect && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`gap-2 px-3 py-1.5 h-9 rounded-md text-base font-inter tracking-wide shadow-none
                    ${isLight 
                      ? "border-gray-300 hover:bg-gray-50" 
                      : "border-gray-700 hover:bg-gray-800 text-white"
                    }
                  `}
                >
                  <Calendar className={`h-4 w-4 ${isLight ? "text-gray-500" : "text-gray-400"}`} />
                  <span className={`text-base font-inter tracking-wide ${!isLight ? "text-white" : ""}`}>
                    {format(selectedDate, 'MMMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 shadow-md border dark:bg-gray-800 dark:border-gray-700" align="end">
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
        {/* Search bar */}
        <div className="w-full sm:w-auto">
          <ScheduleSearch value={searchTerm} onChange={setSearchTerm} />
        </div>
      </div>
    </header>
  );
};

export default ScheduleHeader;
