
import React from "react";
import { useFilteredTeams, useTeamSeeding } from "@/hooks/playoffs";
import { useBracketFormData, useBracketFormState } from "./bracket-teams/hooks";
import { BracketFormTeamsProps } from "./bracket-teams/types";
import {
  TeamSelectionError,
  TeamSelectionLoading,
  TeamSelectionEmpty,
  TeamSelectionForm
} from "./bracket-teams/components";

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
      <TeamSelectionError
        errorMessage={errorMessage || "Failed to load teams"}
        minTeams={minTeams}
        maxTeams={maxTeams}
      />
    );
  }

  // Show loading state if data is loading or not ready
  if (isLoading || !isDataReady) {
    return (
      <TeamSelectionLoading
        minTeams={minTeams}
        maxTeams={maxTeams}
      />
    );
  }

  // Show message if no teams available for selected division
  if (divisionId && filteredTeams.length === 0) {
    return (
      <TeamSelectionEmpty
        minTeams={minTeams}
        maxTeams={maxTeams}
        message="No teams available in this division"
        description="No teams found for the selected division."
      />
    );
  }

  return (
    <TeamSelectionForm
      minTeams={minTeams}
      maxTeams={maxTeams}
      statusMessage={formState.statusMessage}
      availableTeamsCount={seededTeams.length}
      seededTeams={seededTeams}
      selected={formState.selected}
      count={formState.count}
      onTeamToggle={formState.handleTeamToggle}
    />
  );
};

export type { BracketFormTeamsProps };
