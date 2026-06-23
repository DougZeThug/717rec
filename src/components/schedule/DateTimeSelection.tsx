import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { timezoneLog } from '@/utils/logger';

import { formatDateForInput, parseDateFromInput } from './form-utils';
import { DateTimeSelectionProps } from './types';

interface TimeSlotButtonProps {
  time: string;
  isSelected: boolean;
  onSelect: (timeSlot: string) => void;
}

const TimeSlotButton: React.FC<TimeSlotButtonProps> = ({ time, isSelected, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(time);
  }, [onSelect, time]);

  return (
    <Button
      type="button"
      variant={isSelected ? 'default' : 'outline'}
      className={`
        w-28 transition-colors py-2
        ${isSelected ? 'bg-cornhole-navy text-white' : 'border-cornhole-navy text-cornhole-navy'}
      `}
      onClick={handleClick}
    >
      {time}
    </Button>
  );
};

const DateTimeSelection: React.FC<DateTimeSelectionProps> = ({
  selectedDate,
  setSelectedDate,
  selectedTimeSlot,
  setSelectedTimeSlot,
  timeSlots,
}) => {
  // Add debug logging when time slot is selected
  const handleTimeSlotSelect = useCallback(
    (timeSlot: string) => {
      timezoneLog(`Time slot selected: "${timeSlot}" (will be converted to UTC for storage)`);
      setSelectedTimeSlot(timeSlot);
    },
    [setSelectedTimeSlot]
  );

  const handleDateChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedDate(parseDateFromInput(event.target.value));
    },
    [setSelectedDate]
  );

  return (
    <>
      <div>
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          className="h-11"
          value={formatDateForInput(selectedDate)}
          onChange={handleDateChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Time Slot</Label>
        <div className="flex flex-wrap gap-3">
          {timeSlots.map((time) => (
            <div key={time} className="flex items-center">
              <TimeSlotButton
                time={time}
                isSelected={selectedTimeSlot === time}
                onSelect={handleTimeSlotSelect}
              />
            </div>
          ))}
        </div>
        {!selectedTimeSlot && <p className="text-sm text-destructive">Please select a time slot</p>}
      </div>
    </>
  );
};

export default DateTimeSelection;
