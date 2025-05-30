
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

interface TeamSelectionErrorProps {
  errorMessage: string;
  minTeams: number;
  maxTeams: number;
}

export const TeamSelectionError: React.FC<TeamSelectionErrorProps> = ({
  errorMessage,
  minTeams,
  maxTeams
}) => {
  return (
    <FormField
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs text-red-600">
            Error loading team data. Please try refreshing the page.
          </FormDescription>
          <FormControl>
            <Card className="p-4 text-center text-red-500 border-red-300">
              {errorMessage}
            </Card>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
