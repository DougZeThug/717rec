
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
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
  // Verify teams is properly defined
  const validTeams = Array.isArray(teams) ? teams : [];

  return (
    <FormField
      control={form.control}
      name="teams"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Select Teams (Max 16)</FormLabel>
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
        </FormItem>
      )}
    />
  );
};
