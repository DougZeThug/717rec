
import { Team } from "@/types";
import { AlgorithmConfig, PairingResult } from "@/types/autoSchedule";

/**
 * Configuration for dual block pairings
 */
export interface DualBlockConfig extends AlgorithmConfig {
  primaryBlock?: string;
  secondaryBlock?: string;
  unmatchedTeamStrategy?: 'random' | 'lowest-rank' | 'manual';
}

/**
 * Notification callback for errors and warnings
 */
export type NotificationCallback = (message: {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}) => void;

/**
 * Result of validation checks on dual block teams
 */
export interface DualBlockValidationResult {
  isValid: boolean;
  errorMessage?: string;
  warningMessages?: string[];
}

/**
 * Internal state tracking for dual block pairings
 */
export interface DualBlockPairingState {
  earlyTeams: Team[];
  lateTeams: Team[];
  earlyOpponents: Map<string, string>;
  unmatchedTeamId?: string;
  hasOddTeams: boolean;
}
