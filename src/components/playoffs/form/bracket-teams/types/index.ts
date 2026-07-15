// Team selection callback types
interface TeamSelectionCallback {
  ids: string[];
  isValid: boolean;
}

// Form validation types
export interface ValidationProgress {
  percentage: number;
  selected: number;
  required: number;
  maximum: number;
  available: number;
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

// Seed validation types
interface SeedValidationResult {
  team_id: string;
  team_name: string;
  seed: number;
  conflict_count: number;
}

export interface SeedValidationState {
  isLoading: boolean;
  conflicts: SeedValidationResult[];
  hasConflicts: boolean;
  errorMessage: string | null;
}

// Bracket form data types
export interface BracketFormDataResult {
  teams: ProcessedTeam[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  isDataReady: boolean;
  seedValidation?: SeedValidationState;
  refetch?: () => void;
}

// Component props - Updated to use new callback type
interface BracketFormTeamsProps {
  divisionId?: string | null;
  teams?: import('@/types').Team[];
  maxTeams: number;
  minTeams?: number;
  onChange: (data: TeamSelectionCallback) => void;
  divisions?: import('@/types').Division[];
}

// Note: SeedValidationResult is defined above, no need to re-export

// Container-specific types
export interface BracketFormTeamsContainerProps extends BracketFormTeamsProps {
  divisionId?: string | null;
  teams?: import('@/types').Team[];
  minTeams?: number;
  onSeedChange?: (teamId: string, seed: number | null) => void;
}
