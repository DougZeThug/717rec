import { CalendarCheck, Clock, Loader2, Plus } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';

interface BatchMatchFormActionsProps {
  onAutoAssign: () => void;
  onAddMatch: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  isAutoAssigning?: boolean;
}

const BatchMatchFormActions = ({
  onAutoAssign,
  onAddMatch,
  onSubmit,
  isSubmitting = false,
  isAutoAssigning = false,
}: BatchMatchFormActionsProps) => {
  return (
    <div className="flex flex-col gap-4 w-full pt-2">
      <Button
        onClick={onAutoAssign}
        variant="outline"
        className="w-full transition-all duration-200 hover:bg-opacity-90 shadow-sm active:scale-[0.98]"
        disabled={isAutoAssigning}
      >
        {isAutoAssigning ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Assigning...
          </>
        ) : (
          <>
            <Clock className="mr-2 h-4 w-4" />
            Auto Assign Timeslots
          </>
        )}
      </Button>

      <div className="flex flex-col sm:flex-row w-full gap-3">
        <Button
          onClick={onAddMatch}
          variant="outline"
          className="w-full transition-all duration-200 hover:bg-opacity-90 shadow-sm active:scale-[0.98]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Another Match
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full transition-all duration-200 hover:bg-opacity-90 shadow-sm active:scale-[0.98]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CalendarCheck className="mr-2 h-4 w-4" />
              Create Matches
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BatchMatchFormActions;
