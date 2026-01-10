import { Team } from '@/types';
import { PairingResult } from '@/types/autoSchedule';

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
