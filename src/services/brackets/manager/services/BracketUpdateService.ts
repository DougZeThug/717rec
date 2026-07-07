import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError } from '@/types/errors';
import { bracketLog, errorLog, failureLog, successLog } from '@/utils/logger';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  MatchUpdatePayload,
  StorageMatch,
  StorageStage,
  UpdateMatchOptions,
} from '../types/BracketServiceTypes';
import type { BracketNormalizationService } from './BracketNormalizationService';
import type { BracketUpdateContext } from './BracketUpdate';
import {
  markBracketCompleteIfDone,
  normalizeAfterMatchUpdate,
  updateByeMatch,
} from './BracketUpdate';

/**
 * Service responsible for bracket match updates
 * Handles match score updates, BYE propagation, and result normalization
 */
export class BracketUpdateService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager,
    private normalizationService: BracketNormalizationService
  ) {}

  /**
   * Update a match result using brackets-manager with SQL storage
   * Both win and loss must be explicitly set for proper loser propagation
   * Updates are serialized to prevent race conditions during concurrent updates
   */
  updateMatch(options: UpdateMatchOptions): Promise<void> {
    const { matchId, scores } = options;

    bracketLog('🎯 BracketUpdateService.updateMatch() START:', { matchId, scores });

    // Serialize updates to prevent race conditions
    return matchUpdateQueue.enqueue(async () => {
      try {
        const ctx = this.getContext();

        // ⭐ Fetch current match state before update
        const currentMatch = (await this.storage.select(
          'match',
          matchId
        )) as unknown as StorageMatch;
        bracketLog(`CURRENT MATCH STATE - Match ${matchId}:`, {
          opponent1: currentMatch.opponent1,
          opponent2: currentMatch.opponent2,
          round_id: currentMatch.round_id,
          group_id: currentMatch.group_id,
          number: currentMatch.number,
          stage_id: currentMatch.stage_id,
          status: currentMatch.status,
        });

        // ⭐ Check if this is a BYE match (one opponent is null)
        const isByeMatch = !currentMatch.opponent1?.id || !currentMatch.opponent2?.id;

        // ⭐ Load participants into cache before update
        const matchData = currentMatch as StorageMatch;
        const stage = (await this.storage.select('stage', matchData.stage_id)) as StorageStage;
        if (stage) {
          await this.storage.loadParticipantsForTournament(stage.tournament_id);
        }

        if (isByeMatch) {
          await updateByeMatch(ctx, { matchId, scores, currentMatch });
        } else {
          await this.updateNormalMatch(matchId, scores, currentMatch);
        }

        const updatedMatch = await normalizeAfterMatchUpdate(ctx, { matchId, currentMatch });

        // Log all LB matches to see propagation
        const allMatches = (await this.storage.select('match', {
          stage_id: updatedMatch.stage_id,
          group_id: 2, // Loser bracket group
        })) as unknown as StorageMatch[];
        bracketLog(
          `ALL LB MATCHES after Match ${matchId} update:`,
          allMatches.map((m) => ({
            id: m.id,
            round: m.round_id,
            number: m.number,
            opponent1_id: m.opponent1?.id,
            opponent2_id: m.opponent2?.id,
            opponent1_result: m.opponent1?.result,
            opponent2_result: m.opponent2?.result,
          }))
        );

        bracketLog('Match updated successfully in SQL tables');
        successLog('Match updated successfully', String(matchId));

        // ⭐ Detect bracket completion and persist brackets.state = 'completed'.
        // Without this write, useBracketCompletion's realtime subscription never fires
        // and playoff_team_records is never populated. We swallow errors so a failure
        // here cannot break the match update itself.
        if (stage?.tournament_id) {
          await markBracketCompleteIfDone(ctx, stage.tournament_id);
        }
      } catch (error) {
        failureLog('Failed to update match', error);
        errorLog(`FULL ERROR DETAILS for Match ${matchId}:`, error);
        throw new BusinessLogicError(
          `Match update failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error
        );
      }
    });
  }

  private getContext(): BracketUpdateContext {
    return {
      storage: this.storage,
      manager: this.manager,
      normalizationService: this.normalizationService,
    };
  }

  private async updateNormalMatch(
    matchId: number,
    scores: UpdateMatchOptions['scores'],
    currentMatch: StorageMatch
  ): Promise<void> {
    // =============================================
    // NORMAL MATCH PATH: use brackets-manager library
    // =============================================
    // ⭐ Unlock matches that the brackets-manager library will refuse to update.
    //
    // Library status meanings:
    //   0 = Locked, 1 = Waiting, 2 = Ready, 3 = Running,
    //   4 = Completed, 5 = Archived
    //
    // The library throws "The match is locked." for status 0, 1, and 5.
    // Real-world cases we hit:
    //   • status 5 (Archived) — a downstream round already progressed,
    //     but admins still need to correct earlier scores. Flip 5 → 4.
    //   • status 0/1 on a fully populated match — happens on the first
    //     Grand Final match in a double-elimination bracket when the
    //     library doesn't auto-promote it to Ready. Flip 0/1 → 2.
    //
    // Safety: we only auto-promote 0/1 when BOTH opponents are present
    // and it isn't a BYE match, so genuinely incomplete matches stay locked.
    const bothOpponentsPresent =
      Boolean(currentMatch.opponent1?.id) && Boolean(currentMatch.opponent2?.id);

    let unlockToStatus: number | null = null;
    if (currentMatch.status === 5) {
      unlockToStatus = 4;
    } else if (bothOpponentsPresent && (currentMatch.status === 0 || currentMatch.status === 1)) {
      unlockToStatus = 2;
    }

    if (unlockToStatus !== null) {
      bracketLog(
        `🔓 Match ${matchId} status ${currentMatch.status} — temporarily unlocking to status ${unlockToStatus} for admin edit`
      );
      const { error: unlockError } = await supabase
        .from('match')
        .update({ status: unlockToStatus })
        .eq('id', matchId);

      if (unlockError) {
        errorLog(`Failed to unlock match ${matchId}:`, unlockError);
        throw new BusinessLogicError(`Failed to unlock match: ${unlockError.message}`, unlockError);
      }
    }

    bracketLog('CALLING manager.update.match() with:', {
      id: matchId,
      opponent1: scores.opponent1,
      opponent2: scores.opponent2,
    });

    const updatePayload: MatchUpdatePayload = { id: matchId };

    if (scores.opponent1) {
      updatePayload.opponent1 = {
        score: scores.opponent1.score,
        result: scores.opponent1.result,
      };
    }

    if (scores.opponent2) {
      updatePayload.opponent2 = {
        score: scores.opponent2.score,
        result: scores.opponent2.result,
      };
    }

    bracketLog('Final update payload:', updatePayload);

    try {
      await this.manager.update.match(updatePayload);
      bracketLog(`manager.update.match() COMPLETED for Match ${matchId}`);
    } catch (propagationError) {
      const errorMessage =
        propagationError instanceof Error ? propagationError.message : String(propagationError);
      if (
        errorMessage.includes('Match not found') ||
        errorMessage.includes('Position is undefined')
      ) {
        errorLog(
          `⚠️ Tolerated propagation error for Match ${matchId} — relying on normalization safety nets`,
          { matchId, message: errorMessage }
        );
      } else {
        throw propagationError;
      }
    }
  }
}
