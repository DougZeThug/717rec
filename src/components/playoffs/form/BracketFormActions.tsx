
import React from "react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  form?: UseFormReturn<BracketFormValues>; // Add form prop to check division value
}

export const BracketFormActions: React.FC<BracketFormActionsProps> = ({ 
  isSubmitting, 
  onCancel,
  form 
}) => {
  // Check if division is selected
  const divisionId = form?.watch('divisionId');
  const isDivisionSelected = !!divisionId;
  
  return (
    <div className="flex justify-end space-x-2 mt-4">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting || !isDivisionSelected}
        title={!isDivisionSelected ? "Select a division first" : "Create bracket"}
      >
        {isSubmitting ? "Creating..." : "Create Bracket"}
      </Button>
      {!isDivisionSelected && (
        <p className="text-xs text-destructive absolute -bottom-6 right-0">
          Select a division first
        </p>
      )}
    </div>
  );
};
