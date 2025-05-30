
// Re-export Team from main types to avoid duplication
export type { Team, Division } from '@/types';

// Team selection state types
export interface TeamSelectionStateResult {
  selected: Set<string>;
  selectedArray: string[];
  count: number;
  toggle: (teamId: string) => void;
  setSelected: (teamIds: string[]) => void;
  clearSelection: () => void;
  canSelectMore: boolean;
  isAtMaximum: boolean;
  hasSelection: boolean;
}

// Form validation types
export interface ValidationProgress {
  percentage: number;
  selected: number;
  required: number;
  maximum: number;
  available: number;
}

export interface FormValidationResult {
  isValid: boolean;
  isComplete: boolean;
  hasError: boolean;
  hasWarning: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
  statusMessage: string;
  progress: ValidationProgress;
}

// Team selection effects types
export interface TeamSelectionEffectsResult {
  cleanup: () => void;
}

// Consolidated state types
export interface BracketFormStateResult {
  // Team selection
  selected: Set<string>;
  selectedArray: string[];
  count: number;
  handleTeamToggle: (teamId: string) => void;
  clearSelection: () => void;
  canSelectMore: boolean;
  isAtMaximum: boolean;
  hasSelection: boolean;
  
  // Validation
  isValid: boolean;
  isComplete: boolean;
  hasError: boolean;
  hasWarning: boolean;
  errorMessage: string | null;
  warningMessage: string | null;
  statusMessage: string;
  progress: ValidationProgress;
  
  // Effects
  cleanup: () => void;
}

// Use Team from main types - ProcessedTeam is kept for internal processing
export interface ProcessedTeam {
  id: string;
  name: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  seed: number;
  powerScore: number;
  wins: number;
  losses: number;
  division_id: string | null;
  divisionName?: string | null;
  players: string[];
  created_at: string;
  game_wins: number;
  game_losses: number;
  sos: number;
  power_score: number;
  win_percentage: number;
  game_win_percentage: number;
  close_match_losses: number;
}

export interface Ranking {
  teamId: string;
  teamName: string;
  logoUrl?: string | null;
  imageUrl?: string | null;
  powerScore: number;
  wins: number;
  losses: number;
  winPercentage: number;
  gamesWon: number;
  gamesLost: number;
  gameWinPercentage: number;
  sos: number;
  divisionName?: string | null;
  closeMatchLosses?: number;
}

// Division mapping types
export interface DivisionMappingResult {
  divisionMap: Map<string, string>;
  mapDivisionName: (name: string) => string | null;
}

// Team data processor types
export interface TeamDataProcessorResult {
  processedTeams: ProcessedTeam[];
  processingError: string | null;
}

// Bracket form data types
export interface BracketFormDataResult {
  teams: ProcessedTeam[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isDataReady: boolean;
}

// Component props
export interface BracketFormTeamsProps {
  divisionId: string | null;
  maxTeams: number;
  onChange: (ids: string[]) => void;
  divisions?: Division[];
}

// Container-specific types
export interface BracketFormTeamsContainerProps extends BracketFormTeamsProps {
  minTeams?: number;
}
