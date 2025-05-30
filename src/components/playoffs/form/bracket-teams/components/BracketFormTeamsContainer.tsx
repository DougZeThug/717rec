
import React from "react";
import { useFilteredTeams, useTeamSeeding } from "@/hooks/playoffs";
import { useBracketFormData, useBracketFormState } from "../hooks";
import { BracketFormTeamsProps } from "../types";
import { Team } from "@/types";
import {
  TeamSelectionError,
  TeamSelectionLoading,
  TeamSelectionEmpty,
  TeamSelectionForm
} from "./";

interface BracketFormTeamsContainerProps extends BracketFormTeamsProps {
  minTeams?: number;
}

export const BracketFormTeamsContainer: React.FC<BracketFormTeamsContainerProps> = ({ 
  divisionId, 
  maxTeams, 
  onChange,
  divisions = [],
  minTeams = 2
}) => {
  // Use the consolidated data hook
  const { teams: rankedTeams, isLoading, isError, errorMessage, isDataReady } = useBracketFormData(divisions);
  
  // Convert ProcessedTeam[] to Team[] for UI components
  const convertedTeams: Team[] = React.useMemo(() => {
    return rankedTeams.map(team => ({
      id: team.id,
      name: team.name,
      wins: team.wins,
      losses: team.losses,
      game_wins: team.game_wins,
      game_losses: team.game_losses,
      divisionName: team.divisionName,
      division_id: team.division_id,
      imageUrl: team.imageUrl,
      logoUrl: team.logoUrl,
      players: team.players,
      seed: team.seed,
      power_score: team.power_score,
      sos: team.sos,
      win_percentage: team.win_percentage,
      game_win_percentage: team.game_win_percentage,
      created_at: team.created_at,
      close_match_losses: team.close_match_losses
    }));
  }, [rankedTeams]);
  
  // Filter teams by division using the existing hook
  const filteredTeams = useFilteredTeams(convertedTeams, divisionId);
  
  console.log("BracketFormTeamsContainer: Filtering results", {
    totalTeams: convertedTeams.length,
    filteredTeams: filteredTeams.length,
    selectedDivisionId: divisionId,
    sampleTeam: convertedTeams[0] ? {
      name: convertedTeams[0].name,
      division_id: convertedTeams[0].division_id,
      divisionName: convertedTeams[0].divisionName
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
