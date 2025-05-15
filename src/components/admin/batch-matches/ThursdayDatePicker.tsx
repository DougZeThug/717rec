
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { normalizeDate } from "@/utils/dateNormalization";

interface ThursdayDatePickerProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

export const ThursdayDatePicker = ({ selected, onSelect }: ThursdayDatePickerProps) => {
  const isThursday = (date: Date) => {
    return date.getDay() === 4; // 4 represents Thursday (0 = Sunday, 1 = Monday, etc.)
  };

  // Enhanced handler to ensure consistent date handling
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onSelect(null);
      return;
    }
    
    console.log("ThursdayDatePicker - Date selected:", {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      normalizedDate: normalizeDate(date, 'ThursdayDatePicker')
    });
    
    // Create a new Date object at noon to avoid timezone issues
    const safeDate = new Date(date);
    safeDate.setHours(12, 0, 0, 0);
    
    onSelect(safeDate);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !selected && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selected ? (
              <span>
                {format(selected, "PPP")}
                <span className="ml-1 text-xs opacity-50">
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
            selected={selected}
            onSelect={handleDateSelect}
            disabled={(date) => !isThursday(date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
