
import React from "react";
import { Button } from "@/components/ui/button";

interface BatchMatchFormActionsProps {
  onAutoAssign: () => void;
  onAddMatch: () => void;
  onSubmit: () => void;
}

const BatchMatchFormActions = ({ 
  onAutoAssign, 
  onAddMatch, 
  onSubmit 
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
        <Button onClick={onSubmit}>
          Create Matches
        </Button>
      </div>
    </>
  );
};

export default BatchMatchFormActions;
