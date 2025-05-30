
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import SimpleTeamSelectionList from "@/components/playoffs/SimpleTeamSelectionList";
import TeamSelectionSummary from "@/components/playoffs/TeamSelectionSummary";
import { ProcessedTeam } from "../types";

interface TeamSelectionFormProps {
  minTeams: number;
  maxTeams: number;
  statusMessage: string;
  availableTeamsCount: number;
  seededTeams: ProcessedTeam[];
  selected: Set<string>;
  count: number;
  onTeamToggle: (teamId: string) => void;
}

export const TeamSelectionForm: React.FC<TeamSelectionFormProps> = ({
  minTeams,
  maxTeams,
  statusMessage,
  availableTeamsCount,
  seededTeams,
  selected,
  count,
  onTeamToggle
}) => {
  return (
    <FormField
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            {statusMessage}
            {availableTeamsCount > 0 && ` from ${availableTeamsCount} available`}
          </FormDescription>
          <FormControl>
            <SimpleTeamSelectionList
              teams={seededTeams}
              selected={selected}
              onToggle={onTeamToggle}
              maxTeams={maxTeams}
            />
          </FormControl>
          <TeamSelectionSummary 
            count={count} 
            max={maxTeams}
            minTeams={minTeams}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
