
import React from 'react';
import { Division } from '@/types';
import { BracketFormTeamsContainerProps } from '../types';
import { useBracketFormData } from '../hooks/useBracketFormData';
import { useBracketFormState } from '../hooks/useBracketFormState';
import { TeamSelectionLoading } from './TeamSelectionLoading';
import { TeamSelectionError } from './TeamSelectionError';
import { TeamSelectionEmpty } from './TeamSelectionEmpty';
import { TeamSelectionForm } from './TeamSelectionForm';

/**
 * Main container component for bracket team selection
 * Manages data fetching, state, and renders appropriate child components based on loading/error states
 */
export const BracketFormTeamsContainer: React.FC<BracketFormTeamsContainerProps> = ({
  maxTeams,
  minTeams = 2,
  divisions = [],
  onChange
}) => {
  // Fetch and process team data
  const { teams, isLoading, isError, errorMessage } = useBracketFormData(divisions as Division[]);
  
  // Manage form state - fix potential object spreading issue
  const formState = useBracketFormState(
    maxTeams,
    onChange,
    Array.isArray(teams) ? teams.length : 0,
    minTeams
  );

  // Loading state
  if (isLoading) {
    return <TeamSelectionLoading />;
  }

  // Error state
  if (isError) {
    return <TeamSelectionError message={errorMessage || "An error occurred loading teams"} />;
  }

  // Empty state (no teams available)
  if (!Array.isArray(teams) || teams.length === 0) {
    return <TeamSelectionEmpty />;
  }

  // Main form with teams available - ensure proper prop structure
  return (
    <TeamSelectionForm
      teams={teams}
      formState={formState}
      maxTeams={maxTeams}
      minTeams={minTeams}
    />
  );
};
