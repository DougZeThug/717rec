
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateForInput } from "./form-utils";
import { DateTimeSelectionProps } from "./types";

const DateTimeSelection: React.FC<DateTimeSelectionProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTimeSlot,
  setSelectedTimeSlot,
  timeSlots
}) => {
  return (
    <>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={formatDateForInput(selectedDate)}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Time Slot</Label>
        <div className="flex flex-wrap gap-3">
          {timeSlots.map(time => (
            <div key={time} className="flex items-center">
              <Button
                type="button"
                variant={selectedTimeSlot === time ? "default" : "outline"}
                className={`
                  w-28 transition-colors py-2
                  ${selectedTimeSlot === time ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
                `}
                onClick={() => setSelectedTimeSlot(time)}
              >
                {time}
              </Button>
            </div>
          ))}
        </div>
        {!selectedTimeSlot && <p className="text-sm text-destructive">Please select a time slot</p>}
      </div>
    </>
  );
};

export default DateTimeSelection;
