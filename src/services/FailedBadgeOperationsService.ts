import { supabase } from '@/integrations/supabase/client';
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

export interface FailedBadgeOperation {
  id: string;
  type: BadgeOperationType;
  params: Record<string, any>;
  error: string;
  matchId: string;
  createdAt: string;
  retryCount: number;
  lastRetryAt?: string;
}

const STORAGE_KEY = 'failed_badge_operations';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

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
      return stored ? JSON.parse(stored) : [];
    } catch {
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
  static queueFailedOperation(
    type: FailedBadgeOperation['type'],
    params: Record<string, any>,
    error: Error | string,
    matchId: string
  ): void {
    const operations = this.getFailedOperations();

    const newOperation: FailedBadgeOperation = {
      id: crypto.randomUUID(),
      type,
      params,
      error: error instanceof Error ? error.message : String(error),
      matchId,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    operations.push(newOperation);
    this.saveFailedOperations(operations);

    warnLog('Badge operation queued for retry:', { type, matchId, error: newOperation.error });

    // Attempt to notify admin via database (non-blocking)
    this.notifyAdminOfFailure(newOperation).catch(() => {
      // Silent fail - notification is best-effort
    });
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
   * Notify admins about badge processing failures
   * Inserts a record into a notifications table if available
   */
  private static async notifyAdminOfFailure(operation: FailedBadgeOperation): Promise<void> {
    try {
      // Try to insert into admin notifications / messages
      // Using the messages table as a fallback admin notification channel
      const { error } = await supabase.from('messages').insert({
        username: 'System',
        content: `⚠️ Badge processing failed for match ${operation.matchId}. Type: ${operation.type}. Error: ${operation.error}`,
        category: 'admin_notification',
      });

      if (error) {
        // Silent fail - this is a best-effort notification
        warnLog('Could not send admin notification:', error.message);
      } else {
        badgeLog('Admin notified of badge failure');
      }
    } catch (e) {
      // Silent fail
    }
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
        if (error) throw error;
        return;
      }

      case 'kingslayer': {
        const { error } = await supabase.rpc('award_kingslayer_badge', {
          p_winner_id: params.winnerId,
          p_loser_id: params.loserId,
        });
        if (error) throw error;
        return;
      }

      case 'clutch_performer': {
        const { error } = await supabase.rpc('award_clutch_performer_badge', {
          p_team_id: params.winnerId,
        });
        if (error) throw error;
        return;
      }

      case 'consistent_performer': {
        const { error } = await supabase.rpc('award_consistent_performer_badge', {
          p_team_id: params.winnerId,
        });
        if (error) throw error;
        return;
      }

      case 'ice_cold_winner':
      case 'ice_cold_loser': {
        const { error } = await supabase.rpc('award_ice_cold_badge', {
          p_team_id: params.teamId,
        });
        if (error) throw error;
        return;
      }

      case 'broom_crew_winner':
      case 'broom_crew_loser': {
        const { error } = await supabase.rpc('award_broom_crew_badge', {
          p_team_id: params.teamId,
        });
        if (error) throw error;
        return;
      }

      case 'gatekeeper_winner':
      case 'gatekeeper_loser': {
        const { error } = await supabase.rpc('award_gatekeeper_badge', {
          p_team_id: params.teamId,
        });
        if (error) throw error;
        return;
      }

      case 'chaos_agent_winner':
      case 'chaos_agent_loser': {
        const { error } = await supabase.rpc('award_chaos_agent_badge', {
          p_team_id: params.teamId,
        });
        if (error) throw error;
        return;
      }

      case 'bully_winner':
      case 'bully_loser': {
        const { error } = await supabase.rpc('award_bully_badge', {
          p_team_id: params.teamId,
        });
        if (error) throw error;
        return;
      }

      default:
        throw new Error(`Unknown badge operation type: ${type}`);
    }
  }
}
