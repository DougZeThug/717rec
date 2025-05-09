
import React from "react";
import { Calendar } from "lucide-react";
import { ThursdayDatePicker } from "./ThursdayDatePicker";

interface DateSelectionSectionProps {
  selectedDate: Date | null;
  setSelectedDate: (date: Date | null) => void;
}

export const DateSelectionSection: React.FC<DateSelectionSectionProps> = ({ 
  selectedDate, 
  setSelectedDate 
}) => {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Select Match Date</span>
      </div>
      <ThursdayDatePicker
        selected={selectedDate}
        onSelect={setSelectedDate}
      />
      <p className="text-sm text-muted-foreground mt-1">
        Select a Thursday for league play, or another date for special events
      </p>
    </div>
  );
};
