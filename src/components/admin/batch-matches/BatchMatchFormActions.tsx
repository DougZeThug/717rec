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
    <div className="flex w-full gap-3 pt-2">
      <Button
        onClick={onAddMatch}
        variant="outline"
        className="flex-1 transition-all duration-200 hover:bg-opacity-90 shadow-sm active:scale-[0.98]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add Match
      </Button>
      <Button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="flex-1 transition-all duration-200 hover:bg-opacity-90 shadow-sm active:scale-[0.98]"
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
  );
};

export default BatchMatchFormActions;
