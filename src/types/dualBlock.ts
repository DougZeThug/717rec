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
