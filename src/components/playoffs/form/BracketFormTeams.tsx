
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import TeamSelectionList from "../TeamSelectionList";
import { Team } from "@/types";

interface BracketFormTeamsProps {
  form: UseFormReturn<BracketFormValues>;
  teams: Team[] | undefined; // Make teams possibly undefined
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ form, teams }) => {
  // Minimum team requirement
  const minTeams = 2;
  
  // Verify teams is properly defined
  const validTeams = Array.isArray(teams) ? teams : [];
  
  // Get current selection to show count
  const selectedTeams = form.watch('teams') || [];
  const teamCount = selectedTeams.length;

  return (
    <FormField
      control={form.control}
      name="teams"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max 16)</FormLabel>
          <FormDescription className="text-xs">
            Selected {teamCount} of 16 maximum teams
          </FormDescription>
          <FormControl>
            <Card className="p-2 max-h-64 overflow-y-auto">
              <TeamSelectionList
                teams={validTeams}
                selectedTeams={[]}
                selectedTeamIds={field.value}
                onTeamToggle={() => {}}
                onChange={field.onChange}
                maxTeams={16}
              />
            </Card>
          </FormControl>
          <FormMessage />
          {teamCount > 0 && teamCount < minTeams && (
            <p className="text-xs text-amber-500 mt-1">
              Please select at least {minTeams} teams to create a bracket
            </p>
          )}
        </FormItem>
      )}
    />
  );
};
