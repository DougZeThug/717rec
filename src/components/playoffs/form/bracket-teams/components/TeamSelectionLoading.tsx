
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

interface TeamSelectionLoadingProps {
  minTeams: number;
  maxTeams: number;
}

export const TeamSelectionLoading: React.FC<TeamSelectionLoadingProps> = ({
  minTeams,
  maxTeams
}) => {
  return (
    <FormField
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            Loading team rankings and division data...
          </FormDescription>
          <FormControl>
            <Card className="p-4 text-center text-gray-500">
              Loading teams...
            </Card>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
