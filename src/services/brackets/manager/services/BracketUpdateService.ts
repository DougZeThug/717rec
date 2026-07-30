import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { BusinessLogicError, ValidationError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
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
import { collectDownstreamChain } from './BracketAdmin/queries';
import type { BracketNormalizationService } from './BracketNormalizationService';
import type { BracketUpdateContext } from './BracketUpdate';
import { markBracketCompleteIfDone } from './BracketUpdate';

/**
 * Which side of a match is recorded as the winner, or null when neither is.
 *
 * Used to tell a harmless score correction (same winner, new numbers) apart from
 * a winner flip, which is the only edit that re-propagates through later rounds.
 */
function winnerSide(
  opponent1Result: 'win' | 'loss' | 'draw' | null | undefined,
  opponent2Result: 'win' | 'loss' | 'draw' | null | undefined
): 1 | 2 | null {
  if (opponent1Result === 'win') return 1;
  if (opponent2Result === 'win') return 2;
  return null;
}

/**
 * The match columns `manager.update.match` can rewrite, and therefore the ones
 * a rollback has to be able to put back.
 *
 * `*_position` are the feeder markers the library propagates by, and the
 * `*_result` columns carry the stored 'bye' sentinel — restoring a stale value
 * into either would corrupt the bracket, so they are captured verbatim.
 */
const RESTORABLE_MATCH_COLUMNS = [
  'status',
  'opponent1_id',
  'opponent1_score',
  'opponent1_result',
  'opponent1_position',
  'opponent2_id',
  'opponent2_score',
  'opponent2_result',
  'opponent2_position',
] as const;

/** `child_count` rides along only so the rollback can tell when it is incomplete. */
const MATCH_SNAPSHOT_COLUMNS = `id, child_count, ${RESTORABLE_MATCH_COLUMNS.join(', ')}`;

type RestorableMatchColumn = (typeof RESTORABLE_MATCH_COLUMNS)[number];
type MatchSnapshotRow = Pick<Tables<'match'>, 'id' | 'child_count' | RestorableMatchColumn>;

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

        if (this.isScoreOnlyCorrection(currentMatch, scores)) {
          await this.applyScoreOnlyCorrection(matchId, scores);
        } else {
          // Runs BEFORE applyMatchUpdate on purpose: this refuses an edit that WOULD
          // succeed, which no rollback can help with. applyMatchUpdate can undo a
          // failed update, but a flip that the library accepts is not a failure — it
          // silently overwrites scores in later rounds and nothing rolls back.
          // Completed (4) needs the same guard — it re-propagates just as an
          // unlocked Archived match does, it simply skips the unlock to get there.
          if (currentMatch.status >= 4) {
            await this.assertWinnerFlipIsSafe(matchId, currentMatch, scores);
          }

          await this.applyMatchUpdate(matchId, scores, currentMatch);
        }
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

  /**
   * A settled match (Completed or Archived) whose winner is unchanged: only the
   * numbers move, so nothing downstream should be touched.
   */
  private isScoreOnlyCorrection(
    currentMatch: StorageMatch,
    scores: UpdateMatchOptions['scores']
  ): boolean {
    if (currentMatch.status < 4) return false; // 4 Completed, 5 Archived
    const currentWinner = winnerSide(
      currentMatch.opponent1?.result,
      currentMatch.opponent2?.result
    );
    const nextWinner = winnerSide(scores.opponent1?.result, scores.opponent2?.result);
    return currentWinner !== null && nextWinner !== null && currentWinner === nextWinner;
  }

  /**
   * Write a same-winner correction directly, bypassing the library.
   *
   * The library treats every Completed → Completed update as a result change and
   * re-propagates, and its `setNextOpponent` REPLACES the downstream opponent
   * object with just `{id, position}`. The storage adapter then flattens the
   * missing score as NULL and applies it verbatim, so a later round loses a score
   * a human entered even though nobody's result changed. Re-propagating a winner
   * who is already downstream buys nothing, so skip it entirely.
   *
   * Only the four score/result columns are written. Status is left alone (an
   * Archived match stays Archived), as are the ids and the `*_position` feeder
   * markers the library relies on.
   *
   * Safe to write these columns directly: updateMatch has already rejected BYE
   * matches (strict-null slots) and TBD matches above, so both result columns hold
   * a real 'win'/'loss' and the stored 'bye' sentinel cannot be clobbered here.
   */
  private async applyScoreOnlyCorrection(
    matchId: number,
    scores: UpdateMatchOptions['scores']
  ): Promise<void> {
    bracketLog(`Score-only correction for match ${matchId} — not re-propagating`);

    const correctionFields: {
      opponent1_score?: number | null;
      opponent1_result?: string | null;
      opponent2_score?: number | null;
      opponent2_result?: string | null;
    } = {};
    if (scores.opponent1) {
      correctionFields.opponent1_score = scores.opponent1.score ?? null;
      correctionFields.opponent1_result = scores.opponent1.result ?? null;
    }
    if (scores.opponent2) {
      correctionFields.opponent2_score = scores.opponent2.score ?? null;
      correctionFields.opponent2_result = scores.opponent2.result ?? null;
    }

    const { error } = await supabase.from('match').update(correctionFields).eq('id', matchId);
    if (error) {
      handleDatabaseError(error, `Failed to correct the score of match ${matchId}`);
    }
  }

  /**
   * Refuse a winner flip on a settled match that would rewrite matches already played.
   *
   * Handing a settled match back to the library re-propagates its winner forward.
   * `setNextOpponent` *replaces* the downstream opponent object wholesale, so any
   * score already stored there is dropped and the new arrival inherits a result it
   * never earned — a later round showing a win for a team that never played it.
   *
   * Applies to Completed (4) as well as Archived (5). The unlock an Archived match
   * needs first is incidental; what does the damage is the propagation, and a
   * Completed match reaches it directly.
   *
   * Only a winner FLIP gets this far. Same-winner corrections are written directly
   * by applyScoreOnlyCorrection and never reach the library at all.
   *
   * Both continuations are checked: a flip swaps who advances AND who drops to the
   * losers bracket, and the loser's LB match can already be played while the
   * winner's next match is not.
   */
  private async assertWinnerFlipIsSafe(
    matchId: number,
    currentMatch: StorageMatch,
    scores: UpdateMatchOptions['scores']
  ): Promise<void> {
    const currentWinner = winnerSide(
      currentMatch.opponent1?.result,
      currentMatch.opponent2?.result
    );
    const nextWinner = winnerSide(scores.opponent1?.result, scores.opponent2?.result);

    // Nothing has propagated from this match yet, so there is nothing to disturb.
    if (currentWinner === null) return;

    // A settled match being handed a tied or result-less payload. The library would
    // try to un-decide a match whose winner has already moved on; refuse instead.
    if (nextWinner === null) {
      throw new ValidationError(
        'This match already has a winner. Enter a decisive score, or reopen the ' +
          'match to clear the result first.'
      );
    }

    // Same winner: handled by applyScoreOnlyCorrection before reaching this guard.
    if (currentWinner === nextWinner) return;

    const downstream = await collectDownstreamChain({ storage: this.storage }, matchId, {
      includeLoser: true,
    });
    const played = downstream.filter(
      (match) =>
        match.opponent1?.score != null || match.opponent2?.score != null || match.status >= 4
    );

    if (played.length > 0) {
      throw new BusinessLogicError(
        `Cannot change the winner of this match: ${played.length} later ` +
          `match${played.length === 1 ? ' has' : 'es have'} already been played. ` +
          'Use the "Reopen + Clear Downstream" admin action to clear those results first.'
      );
    }
  }

  /**
   * Capture every match in the stage exactly as stored, so a failed update can
   * be undone.
   *
   * Deliberately reads the raw columns instead of going through
   * `storage.select`: that path runs `inflateOpponentSlot`, which turns a
   * stored 'bye' sentinel into `null`. Writing that back would quietly demote a
   * structural BYE to an ordinary TBD slot.
   *
   * Scoped to the whole stage rather than the downstream chain because
   * `updateRelatedMatches` propagates BOTH ways — `updatePrevious` rewrites
   * feeder matches too, so a downstream-only snapshot would miss rows.
   *
   * Throws if the snapshot cannot be taken. Nothing has been written at that
   * point, so failing costs nothing — whereas continuing would silently drop
   * the ability to roll back.
   */
  private async snapshotStageMatches(stageId: number): Promise<MatchSnapshotRow[]> {
    const { data, error } = await supabase
      .from('match')
      .select(MATCH_SNAPSHOT_COLUMNS)
      .eq('stage_id', stageId);

    if (error) {
      handleDatabaseError(error, `Failed to snapshot stage ${stageId} before updating a match`);
    }
    return (data ?? []) as unknown as MatchSnapshotRow[];
  }

  /**
   * Put every row the failed update touched back the way the snapshot found it.
   *
   * Re-reads and writes back only the rows that actually differ, so the usual
   * rollback is one or two writes and the log names exactly what was undone.
   *
   * Best-effort throughout: the caller re-throws the original failure, and
   * nothing here may replace it with a rollback error.
   */
  private async restoreStageMatches(snapshot: MatchSnapshotRow[], stageId: number): Promise<void> {
    const { data, error } = await supabase
      .from('match')
      .select(MATCH_SNAPSHOT_COLUMNS)
      .eq('stage_id', stageId);

    if (error) {
      failureLog(`Could not re-read stage ${stageId} to roll back a failed match update`, error);
      return;
    }

    const current = new Map(
      ((data ?? []) as unknown as MatchSnapshotRow[]).map((row) => [row.id, row])
    );

    const rollbacks = snapshot
      .map((before) => {
        const after = current.get(before.id);
        const changed = after
          ? RESTORABLE_MATCH_COLUMNS.filter((column) => after[column] !== before[column])
          : [];
        return { before, changed };
      })
      .filter(({ changed }) => changed.length > 0);

    if (rollbacks.length === 0) return;

    // The library also writes match_game rows, but only for matches with child
    // games (child_count > 0). This app never creates multi-game series, so
    // there is nothing to undo there — say so out loud if that ever changes.
    if (snapshot.some((row) => (row.child_count ?? 0) > 0)) {
      failureLog(
        `Stage ${stageId} rollback is incomplete`,
        'matches have child games; match_game rows are not covered'
      );
    }

    await Promise.all(
      rollbacks.map(async ({ before, changed }) => {
        const payload = Object.fromEntries(
          changed.map((column) => [column, before[column]])
        ) as Partial<Pick<Tables<'match'>, RestorableMatchColumn>>;
        const { error: restoreError } = await supabase
          .from('match')
          .update(payload)
          .eq('id', before.id);

        if (restoreError) {
          failureLog(`Failed to roll back match ${before.id} after a failed update`, restoreError);
        } else {
          bracketLog(`↩️ Rolled back match ${before.id}: ${changed.join(', ')}`);
        }
      })
    );
  }

  private async applyMatchUpdate(
    matchId: number,
    scores: UpdateMatchOptions['scores'],
    currentMatch: StorageMatch
  ): Promise<void> {
    // Taken before the unlock, so the rollback covers the status flip too.
    const snapshot = await this.snapshotStageMatches(currentMatch.stage_id);

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
    try {
      await this.manager.update.match(updatePayload);
    } catch (error) {
      // The library writes the match itself BEFORE propagating (updater.js
      // applyMatchUpdate, then updateRelatedMatches), so a mid-propagation
      // failure leaves the corrected score saved while the rounds around it
      // still hold results derived from the old one — plus, for an archived
      // match, the unlock already committed. Undo the whole attempt so a failed
      // correction changes nothing. Best-effort: never mask the real failure.
      await this.restoreStageMatches(snapshot, currentMatch.stage_id);
      throw error;
    }
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
