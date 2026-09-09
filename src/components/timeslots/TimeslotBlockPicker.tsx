import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BACK_TO_BACK_PAIRS, DOUBLE_HEADER_START_TIMES } from '@/utils/autoSchedule/constants';

/**
 * One chip per block, plus BYE.
 *
 * A timeslot is never booked on its own: every assignment writes the chosen
 * time *and* the thirty minutes after it, as a back-to-back pair. The chips used
 * to read "6:30 PM", so an admin picking one got two rows they never asked for.
 * They now say what is booked.
 *
 * The value submitted is still the block's first time, which is what the
 * service takes. That also drops 9:30 PM, which is the second half of the 9:00
 * block and no block's start: picking it used to fail on confirm.
 */
const BLOCK_CHOICES: Array<{ value: string; label: string; description: string }> = [
  { value: 'BYE', label: 'BYE WEEK', description: 'No match this week' },
  ...Object.values(BACK_TO_BACK_PAIRS).map((pair) => ({
    value: pair.primary,
    label: `${pair.primary.replace(' PM', '')} + ${pair.secondary}`,
    description: `Books ${pair.primary} and ${pair.secondary}`,
  })),
];

interface TimeslotBlockPickerProps {
  isDoubleHeader: boolean;
  /** The chosen block, as its first time. */
  selectedTimeslot: string;
  /** The two chosen start times, in double header mode. */
  selectedTimeslots: string[];
  onSelectTimeslot: (timeslot: string) => void;
  onToggleTimeslot: (timeslot: string) => void;
}

/** Chooses the block, or the two start times of a double header. */
export const TimeslotBlockPicker: React.FC<TimeslotBlockPickerProps> = ({
  isDoubleHeader,
  selectedTimeslot,
  selectedTimeslots,
  onSelectTimeslot,
  onToggleTimeslot,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      <label className="block text-sm font-medium">
        {isDoubleHeader ? 'Select Two Timeslots' : 'Select a block'}
      </label>
      {isDoubleHeader && (
        <Badge variant="doubleHeader" className="text-xs">
          {selectedTimeslots.length}/2 selected
        </Badge>
      )}
    </div>
    {!isDoubleHeader && (
      <p className="text-xs text-muted-foreground">
        A block is two back-to-back times. Picking one books both.
      </p>
    )}
    {isDoubleHeader ? (
      // Double header mode - multiple selection
      <div className="flex flex-wrap justify-start gap-1.5">
        {DOUBLE_HEADER_START_TIMES.map((time) => {
          const isSelected = selectedTimeslots.includes(time);
          return (
            <Button
              key={time}
              type="button"
              variant="outline"
              onClick={() => onToggleTimeslot(time)}
              className={`
                      px-3 py-1.5 transition-colors
                      ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent hover:from-amber-400 hover:to-orange-400'
                          : 'border-cornhole-navy text-cornhole-navy hover:bg-cornhole-navy/10 dark:!border-blue-200 dark:!text-blue-200 dark:hover:bg-blue-200/10'
                      }
                    `}
            >
              {time}
            </Button>
          );
        })}
      </div>
    ) : (
      // Single timeslot mode
      <ToggleGroup
        type="single"
        value={selectedTimeslot}
        onValueChange={onSelectTimeslot}
        className="flex flex-wrap justify-start gap-1.5"
      >
        {BLOCK_CHOICES.map((choice) => (
          <ToggleGroupItem
            key={choice.value}
            value={choice.value}
            title={choice.description}
            className={`
                  px-3 py-1.5 transition-colors
                  ${
                    choice.value === 'BYE'
                      ? selectedTimeslot === choice.value
                        ? 'bg-orange-600 text-white'
                        : 'border-orange-600 text-orange-600 hover:bg-orange-50 dark:!border-orange-200 dark:!text-orange-200 dark:hover:bg-orange-200/10'
                      : selectedTimeslot === choice.value
                        ? 'bg-cornhole-navy text-white'
                        : 'border-cornhole-navy text-cornhole-navy dark:!border-blue-200 dark:!text-blue-200'
                  }
                `}
          >
            {choice.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    )}
  </div>
);
