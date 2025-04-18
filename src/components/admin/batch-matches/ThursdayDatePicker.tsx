
import React from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ThursdayDatePickerProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
}

export const ThursdayDatePicker = ({ selected, onSelect }: ThursdayDatePickerProps) => {
  const isThursday = (date: Date) => {
    return date.getDay() === 4; // 4 represents Thursday (0 = Sunday, 1 = Monday, etc.)
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
            {selected ? format(selected, "PPP") : <span>Pick a Thursday</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={onSelect}
            disabled={(date) => !isThursday(date)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
