
import React from "react";
import { Button } from "@/components/ui/button";

interface BracketFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export const BracketFormActions: React.FC<BracketFormActionsProps> = ({ 
  isSubmitting, 
  onCancel 
}) => {
  return (
    <div className="flex justify-end space-x-2 mt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create Bracket"}
      </Button>
    </div>
  );
};
