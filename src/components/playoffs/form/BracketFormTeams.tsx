
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { useFilteredTeams, useTeamSeeding } from "@/hooks/playoffs";
import SimpleTeamSelectionList from "../SimpleTeamSelectionList";
import TeamSelectionSummary from "../TeamSelectionSummary";
import { useBracketFormData, useBracketFormState } from "./bracket-teams/hooks";
import { BracketFormTeamsProps } from "./bracket-teams/types";

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ 
  divisionId, 
  maxTeams, 
  onChange,
  divisions = []
}) => {
  // Minimum team requirement
  const minTeams = 2;
  
  // Use the consolidated data hook
  const { teams: rankedTeams, isLoading, isError, errorMessage, isDataReady } = useBracketFormData(divisions);
  
  // Filter teams by division using the existing hook
  const filteredTeams = useFilteredTeams(rankedTeams, divisionId);
  
  console.log("BracketFormTeams: Filtering results", {
    totalTeams: rankedTeams.length,
    filteredTeams: filteredTeams.length,
    selectedDivisionId: divisionId,
    sampleTeam: rankedTeams[0] ? {
      name: rankedTeams[0].name,
      division_id: rankedTeams[0].division_id,
      divisionName: rankedTeams[0].divisionName
    } : null
  });
  
  // Apply seeding using the existing hook
  const seededTeams = useTeamSeeding(filteredTeams);
  
  // Consolidated state management
  const formState = useBracketFormState(
    maxTeams,
    onChange,
    seededTeams.length,
    minTeams
  );

  // Show error state if data failed to load
  if (isError) {
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
  }

  // Show loading state if data is loading or not ready
  if (isLoading || !isDataReady) {
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
  }

  // Show message if no teams available for selected division
  if (divisionId && filteredTeams.length === 0) {
    return (
      <FormField
        name="teams"
        render={() => (
          <FormItem>
            <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
            <FormDescription className="text-xs">
              No teams found for the selected division.
            </FormDescription>
            <FormControl>
              <Card className="p-4 text-center text-gray-500">
                No teams available in this division
              </Card>
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            {formState.statusMessage}
            {seededTeams.length > 0 && ` from ${seededTeams.length} available`}
          </FormDescription>
          <FormControl>
            <SimpleTeamSelectionList
              teams={seededTeams}
              selected={formState.selected}
              onToggle={formState.handleTeamToggle}
              maxTeams={maxTeams}
            />
          </FormControl>
          <TeamSelectionSummary 
            count={formState.count} 
            max={maxTeams}
            minTeams={minTeams}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export type { BracketFormTeamsProps };
