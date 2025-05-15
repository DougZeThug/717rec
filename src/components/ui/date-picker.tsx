
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeDate } from "@/utils/dateNormalization";

interface DatePickerProps {
  date: Date | null;
  onDateChange: (date: Date | null) => void;
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
  // Add logging to track date selection
  const handleDateSelect = (newDate: Date | undefined) => {
    console.log("DatePicker - Date selected:", {
      newDate,
      newDateString: newDate?.toString(),
      newDateIso: newDate?.toISOString(),
      normalizedDate: newDate ? normalizeDate(newDate, 'DatePicker') : null
    });
    
    if (newDate) {
      // Create a new Date object at noon to avoid timezone issues
      // This ensures the date displayed is the same as what's selected
      const safeDate = new Date(newDate);
      safeDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone edge cases
      
      console.log("DatePicker - Using safe date:", {
        safeDate,
        safeDateString: safeDate.toString(),
        safeDateIso: safeDate.toISOString()
      });
      
      onDateChange(safeDate);
    } else {
      onDateChange(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
