import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { bracketLog, failureLog, successLog } from '@/utils/logger';
import { assertNonNegativeNumber } from '@/utils/validation';

import { matchUpdateQueue } from '../MatchUpdateQueue';
import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type {
  MatchUpdatePayload,
  StorageGroup,
  StorageMatch,
  StorageRound,
  StorageStage,
  UpdateMatchOptions,
} from '../types/BracketServiceTypes';
import type { BracketNormalizationService } from './BracketNormalizationService';
import type { BracketUpdateContext } from './BracketUpdate';
import { markBracketCompleteIfDone } from './BracketUpdate';

/**
 * Service responsible for bracket match updates.
 *
 * The library's own state machine drives everything: score writes, winner and
 * loser propagation, BYE resolution, and match archival all happen inside
 * `manager.update.match`. Errors are thrown loudly — there is no automatic
 * repair layer (admins have the explicit Repair Bracket action instead).
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
      // Guard against negative scores at the service boundary, regardless of UI clamping.
      if (scores.opponent1?.score !== undefined) {
        assertNonNegativeNumber(scores.opponent1.score, 'Opponent 1 score');
      }
      if (scores.opponent2?.score !== undefined) {
        assertNonNegativeNumber(scores.opponent2.score, 'Opponent 2 score');
      }
      try {
        const currentMatch = (await this.storage.select(
          'match',
          matchId
        )) as unknown as StorageMatch | null;
        if (!currentMatch) {
          throw new ValidationError(`Match ${matchId} not found`);
        }

        // BYE slots (strict null) resolve automatically at creation and
        // during propagation; TBD slots ({ id: null }) fill in when earlier
        // matches finish. Neither is scoreable through the normal path.
        if (currentMatch.opponent1 === null || currentMatch.opponent2 === null) {
          throw new ValidationError(
            'This match has a BYE and resolves automatically. ' +
              'For older brackets, use the BYE controls in the match editor.'
          );
        }
        if (currentMatch.opponent1?.id == null || currentMatch.opponent2?.id == null) {
          throw new ValidationError(
            'This match is still waiting on earlier results. ' +
              'If a finished match failed to advance its winner, use Repair Bracket.'
          );
        }

        const stage = (await this.storage.select('stage', currentMatch.stage_id)) as StorageStage;

        await this.applyMatchUpdate(matchId, scores, currentMatch);
        await this.archiveResetMatchIfDecided(matchId, stage);

        bracketLog('Match updated successfully in SQL tables');
        successLog('Match updated successfully', String(matchId));

        // Detect bracket completion and persist brackets.state = 'completed'.
        // Errors propagate: a failed completion check fails the update loudly
        // instead of leaving the bracket silently inconsistent.
        if (stage?.tournament_id) {
          await markBracketCompleteIfDone(this.getContext(), stage.tournament_id);
        }
      } catch (error) {
        failureLog('Failed to update match', error);
        if (error instanceof ValidationError) throw error;
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

  private async applyMatchUpdate(
    matchId: number,
    scores: UpdateMatchOptions['scores'],
    currentMatch: StorageMatch
  ): Promise<void> {
    // ⭐ Admin corrections: the library refuses to update Archived matches
    // ("The match is locked."), but admins legitimately need to fix scores on
    // matches whose downstream rounds already progressed. Temporarily flip
    // 5 → 4 (Completed, which the library edits and re-propagates from).
    if (currentMatch.status === 5) {
      bracketLog(`🔓 Match ${matchId} is Archived — unlocking to Completed for admin correction`);
      const { error: unlockError } = await supabase
        .from('match')
        .update({ status: 4 })
        .eq('id', matchId);

      if (unlockError) {
        throw new BusinessLogicError(`Failed to unlock match: ${unlockError.message}`, unlockError);
      }
    }

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

    bracketLog('CALLING manager.update.match() with:', updatePayload);
    // No tolerated errors: if the library refuses the update or propagation
    // fails, the whole operation fails loudly.
    await this.manager.update.match(updatePayload);
    bracketLog(`manager.update.match() COMPLETED for Match ${matchId}`);
  }

  /**
   * Double grand final decisive semantics: when the winners-bracket champion
   * (opponent1) wins the first grand-final match, the tournament is decided —
   * but the library leaves the reset match populated and Ready forever
   * (its own standings ignore it via getGrandFinalDecisiveMatch). Archive the
   * ghost reset match so completion checks, the playoff_matches sync, and the
   * server-side standings all agree the bracket is finished.
   */
  private async archiveResetMatchIfDecided(
    matchId: number,
    stage: StorageStage | null
  ): Promise<void> {
    const grandFinal = (stage?.settings as { grandFinal?: string } | undefined)?.grandFinal;
    if (grandFinal !== 'double') return;

    const updatedMatch = (await this.storage.select(
      'match',
      matchId
    )) as unknown as StorageMatch | null;
    if (!updatedMatch || updatedMatch.status !== 4) return;

    const groups = await this.storage.select('group', { stage_id: updatedMatch.stage_id });
    const gfGroup = ((Array.isArray(groups) ? groups : [groups]) as StorageGroup[]).find(
      (g) => g?.number === 3
    );
    if (!gfGroup || updatedMatch.group_id !== gfGroup.id) return;

    const rounds = await this.storage.select('round', { group_id: gfGroup.id });
    const roundsArray = (Array.isArray(rounds) ? rounds : [rounds]) as StorageRound[];
    const gfRound1 = roundsArray.find((r) => r?.number === 1);
    const gfRound2 = roundsArray.find((r) => r?.number === 2);
    if (!gfRound1 || !gfRound2 || updatedMatch.round_id !== gfRound1.id) return;

    // Decisive iff the WB champion (opponent1 of GF1) won GF1.
    if (updatedMatch.opponent1?.result !== 'win') return;

    const resetMatches = await this.storage.select('match', { round_id: gfRound2.id });
    const resetMatch = (
      (Array.isArray(resetMatches) ? resetMatches : [resetMatches]) as StorageMatch[]
    )[0];
    if (!resetMatch || resetMatch.status >= 4) return;

    bracketLog(
      `🏁 GF1 decided by the WB champion — archiving unneeded reset match ${resetMatch.id}`
    );
    const { error } = await supabase.from('match').update({ status: 5 }).eq('id', resetMatch.id);
    if (error) {
      throw new BusinessLogicError(
        `Failed to archive the unneeded grand-final reset match: ${error.message}`,
        error
      );
    }
  }
}
