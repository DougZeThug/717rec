
import { Team } from "@/types";

export interface BracketFormTeamsProps {
  divisionId: string | null;
  maxTeams: number;
  onChange: (ids: string[]) => void;
  divisions?: { id: string; name: string }[];
}

export interface Ranking {
  teamId: string;
  teamName: string;
  powerScore: number;
  wins: number;
  losses: number;
  divisionName?: string;
  imageUrl?: string;
  gamesWon?: number;
  gamesLost?: number;
  sos?: number;
  winPercentage?: number;
  gameWinPercentage?: number;
  closeMatchLosses?: number;
}

export interface Division {
  id: string;
  name: string;
}

export interface ProcessedTeam extends Team {
  seed: number;
  powerScore: number;
  wins: number;
  losses: number;
  divisionName?: string;
}

export interface TeamDataProcessorResult {
  processedTeams: ProcessedTeam[];
  processingError: string | null;
}

export interface BracketFormDataResult {
  teams: ProcessedTeam[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isDataReady: boolean;
}

export interface DivisionMappingResult {
  divisionMap: Map<string, string>;
  mapDivisionName: (name: string) => string | null;
}

export interface TeamSelectionStateResult {
  selected: Set<string>;
  handleTeamToggle: (teamId: string) => void;
  selectedCount: number;
  selectedArray: string[];
}

export interface FormValidationResult {
  isValid: boolean;
  validationMessage: string | null;
  canSubmit: boolean;
}

export interface TeamSelectionUIState {
  type: 'loading' | 'error' | 'empty' | 'success';
  message?: string;
}
