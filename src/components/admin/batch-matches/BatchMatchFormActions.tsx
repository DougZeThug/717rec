
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface BatchMatchFormActionsProps {
  onAutoAssign: () => void;
  onAddMatch: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

const BatchMatchFormActions = ({ 
  onAutoAssign, 
  onAddMatch, 
  onSubmit,
  isSubmitting = false
}: BatchMatchFormActionsProps) => {
  return (
    <>
      <div className="flex flex-col space-y-4">
        <Button 
          onClick={onAutoAssign}
          variant="outline"
          className="w-auto"
        >
          Auto Assign Timeslots
        </Button>
      </div>

      <div className="flex justify-between pt-4">
        <Button onClick={onAddMatch} variant="outline">
          + Add Another Match
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Matches...
            </>
          ) : (
            "Create Matches"
          )}
        </Button>
      </div>
    </>
  );
};

export default BatchMatchFormActions;
