import type { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { NotFoundError } from '@/types/errors';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog, successLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageMatch, StorageStage } from '../types/BracketServiceTypes';
import type { BracketNormalizationService } from './BracketNormalizationService';
import type { BracketUpdateContext } from './BracketUpdate';
import { markBracketCompleteIfDone } from './BracketUpdate';

/**
 * What a repair run actually did — surfaced to the admin so the action is
 * auditable rather than silent magic.
 */
export interface BracketRepairSummary {
  stagesRepaired: number;
  /** Match rows whose opponents/results/status changed during the repair. */
  matchesChanged: number;
  /** Matches flipped from Locked/Waiting to Ready because both slots are filled. */
  statusesNormalized: number;
  /** Whether this run transitioned brackets.state to 'completed'. */
  bracketMarkedCompleted: boolean;
}

/** The per-match fields the repair passes may touch, for change detection. */
const matchFingerprint = (m: StorageMatch): string =>
  JSON.stringify([
    m.opponent1?.id ?? null,
    m.opponent1?.score ?? null,
    m.opponent1?.result ?? null,
    m.opponent2?.id ?? null,
    m.opponent2?.score ?? null,
    m.opponent2?.result ?? null,
    m.status,
  ]);

/**
 * Explicit, admin-triggered bracket repair.
 *
 * Runs the normalization/propagation passes that older brackets may need
 * (stuck losers-round slots, unpopulated grand finals, winners that never
 * advanced) exactly ONCE, then re-evaluates bracket completion. This is the
 * gated home for the repair machinery that previously ran automatically on
 * every score save.
 */
export class BracketRepairService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager,
    private normalizationService: BracketNormalizationService
  ) {}

  async repairBracket(bracketId: string): Promise<BracketRepairSummary> {
    bracketLog('🔧 Admin bracket repair requested', { bracketId });

    const stages = await this.storage.select('stage', { tournament_id: bracketId });
    const stagesArray = (Array.isArray(stages) ? stages : stages ? [stages] : []) as StorageStage[];
    if (stagesArray.length === 0) {
      throw new NotFoundError('Bracket stage', bracketId);
    }

    const summary: BracketRepairSummary = {
      stagesRepaired: 0,
      matchesChanged: 0,
      statusesNormalized: 0,
      bracketMarkedCompleted: false,
    };

    for (const stage of stagesArray) {
      const before = await this.snapshotStage(stage.id);

      // Single pass of each repair — no retry loops, no sleeps.
      await this.normalizationService.normalizeLosersR1(stage.id);
      await this.normalizationService.normalizeGrandFinalPopulation(stage.id);
      await this.normalizationService.propagateCompletedMatches(stage.id);
      summary.statusesNormalized += await this.readyFullyPopulatedMatches(stage.id);

      const after = await this.snapshotStage(stage.id);
      for (const [matchId, fingerprint] of after) {
        if (before.get(matchId) !== fingerprint) summary.matchesChanged += 1;
      }
      summary.stagesRepaired += 1;
    }

    summary.bracketMarkedCompleted = await this.reevaluateCompletion(bracketId);

    successLog('Bracket repair complete', JSON.stringify(summary));
    return summary;
  }

  private async snapshotStage(stageId: number): Promise<Map<number, string>> {
    const matches = await this.storage.select('match', { stage_id: stageId });
    const matchesArray = (
      Array.isArray(matches) ? matches : matches ? [matches] : []
    ) as StorageMatch[];
    return new Map(matchesArray.map((m) => [m.id, matchFingerprint(m)]));
  }

  /**
   * Flip Locked/Waiting matches whose BOTH opponent slots are filled up to
   * Ready — the state the library would have given them had propagation not
   * been interrupted. Loud on database errors.
   */
  private async readyFullyPopulatedMatches(stageId: number): Promise<number> {
    const matches = await this.storage.select('match', { stage_id: stageId });
    const matchesArray = (
      Array.isArray(matches) ? matches : matches ? [matches] : []
    ) as StorageMatch[];

    let normalized = 0;
    for (const match of matchesArray) {
      const fullyPopulated = Boolean(match.opponent1?.id) && Boolean(match.opponent2?.id);
      if (!fullyPopulated || (match.status !== 0 && match.status !== 1)) continue;

      const { error } = await supabase.from('match').update({ status: 2 }).eq('id', match.id);
      if (error) handleDatabaseError(error, `Failed to ready match ${match.id}`);
      normalized += 1;
    }
    return normalized;
  }

  private async reevaluateCompletion(bracketId: string): Promise<boolean> {
    const stateBefore = await this.fetchBracketState(bracketId);
    const ctx: BracketUpdateContext = {
      storage: this.storage,
      manager: this.manager,
      normalizationService: this.normalizationService,
    };
    await markBracketCompleteIfDone(ctx, bracketId);
    const stateAfter = await this.fetchBracketState(bracketId);
    return stateBefore !== 'completed' && stateAfter === 'completed';
  }

  private async fetchBracketState(bracketId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('brackets')
      .select('id, state')
      .eq('id', bracketId)
      .maybeSingle();
    if (error) handleDatabaseError(error, 'Failed to read bracket state');
    return data?.state ?? null;
  }
}
