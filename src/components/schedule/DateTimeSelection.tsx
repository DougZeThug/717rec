import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { timezoneLog } from '@/utils/logger';

import { formatDateForInput, parseDateFromInput } from './form-utils';
import { DateTimeSelectionProps } from './types';

const DateTimeSelection: React.FC<DateTimeSelectionProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTimeSlot,
  setSelectedTimeSlot,
  timeSlots,
}) => {
  // Add debug logging when time slot is selected
  const handleTimeSlotSelect = (timeSlot: string) => {
    timezoneLog(`Time slot selected: "${timeSlot}" (will be converted to UTC for storage)`);
    setSelectedTimeSlot(timeSlot);
  };

  return (
    <>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          className="h-11"
          value={formatDateForInput(selectedDate)}
          onChange={(e) => setSelectedDate(parseDateFromInput(e.target.value))}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Time Slot</Label>
        <div className="flex flex-wrap gap-3">
          {timeSlots.map((time) => (
            <div key={time} className="flex items-center">
              <Button
                type="button"
                variant={selectedTimeSlot === time ? 'default' : 'outline'}
                className={`
                  w-28 transition-colors py-2
                  ${selectedTimeSlot === time ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
                `}
                onClick={() => handleTimeSlotSelect(time)}
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
