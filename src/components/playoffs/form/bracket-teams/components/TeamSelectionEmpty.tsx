
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

interface TeamSelectionEmptyProps {
  minTeams: number;
  maxTeams: number;
  message: string;
  description: string;
}

export const TeamSelectionEmpty: React.FC<TeamSelectionEmptyProps> = ({
  minTeams,
  maxTeams,
  message,
  description
}) => {
  return (
    <FormField
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            {description}
          </FormDescription>
          <FormControl>
            <Card className="p-4 text-center text-gray-500">
              {message}
            </Card>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
