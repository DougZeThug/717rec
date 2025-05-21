
import React from "react";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";

interface BracketFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  form?: UseFormReturn<BracketFormValues>; // Add form prop to check team selection
}

export const BracketFormActions: React.FC<BracketFormActionsProps> = ({ 
  isSubmitting, 
  onCancel,
  form 
}) => {
  // Minimum team requirement
  const minTeams = 2;
  
  // Check that division and teams requirements are met
  const divisionId = form?.watch('divisionId');
  const isDivisionSelected = !!divisionId;
  
  const selectedTeams = form?.watch('teams') || [];
  const hasEnoughTeams = selectedTeams.length >= minTeams;
  
  // Button should be disabled if there's no division or not enough teams
  const isDisabled = isSubmitting || !isDivisionSelected || !hasEnoughTeams;
  
  // Calculate button title based on validation state
  const buttonTitle = !isDivisionSelected 
    ? "Select a division first" 
    : !hasEnoughTeams 
      ? `Select at least ${minTeams} teams` 
      : "Create bracket";
  
  return (
    <div className="flex justify-end space-x-2 mt-4 relative">
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isDisabled}
        title={buttonTitle}
      >
        {isSubmitting ? "Creating..." : "Create Bracket"}
      </Button>
      
      {/* Show appropriate error messages */}
      {!isDivisionSelected && (
        <p className="text-xs text-destructive absolute -bottom-6 right-0">
          Select a division first
        </p>
      )}
      {isDivisionSelected && !hasEnoughTeams && (
        <p className="text-xs text-destructive absolute -bottom-6 right-0">
          Select at least {minTeams} teams
        </p>
      )}
    </div>
  );
};
