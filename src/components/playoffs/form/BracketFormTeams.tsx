
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import TeamSelectionList from "../TeamSelectionList";
import { Team } from "@/types";

interface BracketFormTeamsProps {
  form: UseFormReturn<BracketFormValues>;
  teams: Team[];
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ form, teams }) => {
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
                teams={teams}
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
