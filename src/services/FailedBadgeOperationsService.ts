import { supabase } from '@/integrations/supabase/client';
import { ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { badgeLog, errorLog, warnLog } from '@/utils/logger';

export type BadgeOperationType =
  | 'match_badges'
  | 'kingslayer'
  | 'clutch_performer'
  | 'consistent_performer'
  | 'ice_cold_winner'
  | 'ice_cold_loser'
  | 'broom_crew_winner'
  | 'broom_crew_loser'
  | 'gatekeeper_winner'
  | 'gatekeeper_loser'
  | 'chaos_agent_winner'
  | 'chaos_agent_loser'
  | 'bully_winner'
  | 'bully_loser';

type MatchBadgesParams = { team1Id: string; team2Id: string };
type KingslayerParams = { winnerId: string; loserId: string };
type ClutchPerformerParams = { winnerId: string; team1GameWins: number; team2GameWins: number };
type ConsistentPerformerParams = { winnerId: string };
type TeamIdParams = { teamId: string };

export type BadgeOperationParams = {
  match_badges: MatchBadgesParams;
  kingslayer: KingslayerParams;
  clutch_performer: ClutchPerformerParams;
  consistent_performer: ConsistentPerformerParams;
  ice_cold_winner: TeamIdParams;
  ice_cold_loser: TeamIdParams;
  broom_crew_winner: TeamIdParams;
  broom_crew_loser: TeamIdParams;
  gatekeeper_winner: TeamIdParams;
  gatekeeper_loser: TeamIdParams;
  chaos_agent_winner: TeamIdParams;
  chaos_agent_loser: TeamIdParams;
  bully_winner: TeamIdParams;
  bully_loser: TeamIdParams;
};

type FailedBadgeOperationBase = {
  id: string;
  error: string;
  matchId: string;
  createdAt: string;
  retryCount: number;
  lastRetryAt?: string;
};

export type FailedBadgeOperation = {
  [K in BadgeOperationType]: FailedBadgeOperationBase & { type: K; params: BadgeOperationParams[K] };
}[BadgeOperationType];

const STORAGE_KEY = 'failed_badge_operations';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

const VALID_OPERATION_TYPES = new Set<string>([
  'match_badges',
  'kingslayer',
  'clutch_performer',
  'consistent_performer',
  'ice_cold_winner',
  'ice_cold_loser',
  'broom_crew_winner',
  'broom_crew_loser',
  'gatekeeper_winner',
  'gatekeeper_loser',
  'chaos_agent_winner',
  'chaos_agent_loser',
  'bully_winner',
  'bully_loser',
]);

function isValidFailedBadgeOperation(item: unknown): item is FailedBadgeOperation {
  if (!item || typeof item !== 'object') return false;
  const op = item as Record<string, unknown>;
  return (
    typeof op.id === 'string' &&
    typeof op.type === 'string' &&
    VALID_OPERATION_TYPES.has(op.type) &&
    typeof op.params === 'object' &&
    op.params !== null &&
    typeof op.error === 'string' &&
    typeof op.matchId === 'string' &&
    typeof op.createdAt === 'string' &&
    typeof op.retryCount === 'number'
  );
}

/**
 * Service to handle failed badge operations with retry capability
 * and admin notifications.
 */
export class FailedBadgeOperationsService {
  /**
   * Get all failed operations from storage
   */
  static getFailedOperations(): FailedBadgeOperation[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidFailedBadgeOperation);
    } catch (e) {
      errorLog('Failed to read badge operations from storage:', e);
      return [];
    }
  }

  /**
   * Save failed operations to storage
   */
  private static saveFailedOperations(operations: FailedBadgeOperation[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
    } catch (e) {
      errorLog('Failed to save badge operations to storage:', e);
    }
  }

  /**
   * Queue a failed badge operation for retry
   */
  static queueFailedOperation<T extends BadgeOperationType>(
    type: T,
    params: BadgeOperationParams[T],
    error: Error | string,
    matchId: string
  ): void {
    const operations = this.getFailedOperations();
    const normalizedParams = JSON.stringify(params);
    const existingOperation = operations.find(
      (operation) =>
        operation.type === type &&
        operation.matchId === matchId &&
        JSON.stringify(operation.params) === normalizedParams
    );

    if (existingOperation) {
      existingOperation.error = error instanceof Error ? error.message : String(error);
      existingOperation.lastRetryAt = new Date().toISOString();
      this.saveFailedOperations(operations);
      warnLog('Duplicate badge operation merged into existing retry item:', {
        type,
        matchId,
      });
      return;
    }

    const newOperation = {
      id: crypto.randomUUID(),
      type,
      params,
      error: error instanceof Error ? error.message : String(error),
      matchId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    } as FailedBadgeOperation;

    operations.push(newOperation);
    this.saveFailedOperations(operations);

    warnLog('Badge operation queued for retry:', { type, matchId, error: newOperation.error });
  }

  /**
   * Remove a successfully processed operation
   */
  static removeOperation(operationId: string): void {
    const operations = this.getFailedOperations();
    const filtered = operations.filter((op) => op.id !== operationId);
    this.saveFailedOperations(filtered);
  }

  /**
   * Clear all failed operations
   */
  static clearAllOperations(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get count of pending failed operations
   */
  static getFailedOperationCount(): number {
    return this.getFailedOperations().length;
  }

  /**
   * Check if there are any pending retries
   */
  static hasPendingRetries(): boolean {
    return this.getFailedOperationCount() > 0;
  }

  /**
   * Retry all failed operations
   * Returns summary of retry results
   */
  static async retryFailedOperations(): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    remaining: FailedBadgeOperation[];
  }> {
    const operations = this.getFailedOperations();

    if (operations.length === 0) {
      return { total: 0, succeeded: 0, failed: 0, remaining: [] };
    }

    badgeLog(`Retrying ${operations.length} failed badge operations`);

    let succeeded = 0;
    let failed = 0;
    const remaining: FailedBadgeOperation[] = [];

    for (const operation of operations) {
      if (operation.retryCount >= MAX_RETRIES) {
        errorLog('Max retries exceeded for badge operation:', operation);
        remaining.push(operation);
        failed++;
        continue;
      }

      try {
        await this.executeOperation(operation);
        succeeded++;
        badgeLog('Successfully retried badge operation:', operation.type);
      } catch (e) {
        operation.retryCount++;
        operation.lastRetryAt = new Date().toISOString();
        operation.error = e instanceof Error ? e.message : String(e);
        remaining.push(operation);
        failed++;
        warnLog('Retry failed for badge operation:', {
          type: operation.type,
          retryCount: operation.retryCount,
        });
      }

      // Small delay between retries to avoid overwhelming the database
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }

    this.saveFailedOperations(remaining);

    return {
      total: operations.length,
      succeeded,
      failed,
      remaining,
    };
  }

  /**
   * Execute a single badge operation
   */
  private static async executeOperation(operation: FailedBadgeOperation): Promise<void> {
    const { type, params } = operation;

    switch (type) {
      case 'match_badges': {
        const { error } = await supabase.rpc('process_match_badges', {
          p_team1_id: params.team1Id,
          p_team2_id: params.team2Id,
        });
        if (error) handleDatabaseError(error, 'Failed to retry match_badges operation');
        return;
      }

      case 'kingslayer': {
        const { error } = await supabase.rpc('award_kingslayer_badge', {
          p_winner_id: params.winnerId,
          p_loser_id: params.loserId,
        });
        if (error) handleDatabaseError(error, 'Failed to retry kingslayer operation');
        return;
      }

      case 'clutch_performer': {
        const { error } = await supabase.rpc('award_clutch_performer_badge', {
          p_team_id: params.winnerId,
        });
        if (error) handleDatabaseError(error, 'Failed to retry clutch_performer operation');
        return;
      }

      case 'consistent_performer': {
        const { error } = await supabase.rpc('award_consistent_performer_badge', {
          p_team_id: params.winnerId,
        });
        if (error) handleDatabaseError(error, 'Failed to retry consistent_performer operation');
        return;
      }

      case 'ice_cold_winner':
      case 'ice_cold_loser': {
        const { error } = await supabase.rpc('award_ice_cold_badge', {
          p_team_id: params.teamId,
        });
        if (error) handleDatabaseError(error, `Failed to retry ${type} operation`);
        return;
      }

      case 'broom_crew_winner':
      case 'broom_crew_loser': {
        const { error } = await supabase.rpc('award_broom_crew_badge', {
          p_team_id: params.teamId,
        });
        if (error) handleDatabaseError(error, `Failed to retry ${type} operation`);
        return;
      }

      case 'gatekeeper_winner':
      case 'gatekeeper_loser': {
        const { error } = await supabase.rpc('award_gatekeeper_badge', {
          p_team_id: params.teamId,
        });
        if (error) handleDatabaseError(error, `Failed to retry ${type} operation`);
        return;
      }

      case 'chaos_agent_winner':
      case 'chaos_agent_loser': {
        const { error } = await supabase.rpc('award_chaos_agent_badge', {
          p_team_id: params.teamId,
        });
        if (error) handleDatabaseError(error, `Failed to retry ${type} operation`);
        return;
      }

      case 'bully_winner':
      case 'bully_loser': {
        const { error } = await supabase.rpc('award_bully_badge', {
          p_team_id: params.teamId,
        });
        if (error) handleDatabaseError(error, `Failed to retry ${type} operation`);
        return;
      }

      default:
        throw new ValidationError(`Unknown badge operation type: ${type}`);
    }
  }
}
