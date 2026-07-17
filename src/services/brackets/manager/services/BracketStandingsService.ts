import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from '@/types/errors';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageStage } from '../types/BracketServiceTypes';
import type { BracketNormalizationService } from './BracketNormalizationService';

/**
 * Result of a final-standings calculation attempt.
 * - 'written': records were upserted into playoff_team_records
 * - 'reason': when not written, why we bailed out (so the caller can show
 *   an appropriate toast instead of a destructive error)
 */
export interface FinalStandingsResult {
  written: boolean;
  reason?: 'no-stages' | 'incomplete-matches' | 'calculation-error' | 'no-records';
}

/** brackets-manager match status: 4 = Completed, 5 = Archived. Anything lower is unresolved. */
const MATCH_STATUS_COMPLETED = 4;

/**
 * Service for calculating and managing bracket standings
 */
export class BracketStandingsService {
  constructor(
    private storage: SupabaseSqlStorage,
    private manager: BracketsManager,
    private normalizationService?: BracketNormalizationService
  ) {}

  /**
   * Calculate and store final standings for a completed bracket
   *
   * Returns a result describing whether records were written. Never throws
   * for "expected" failure modes (incomplete matches, brackets-manager
   * lookup errors) — those are logged and surfaced via the returned
   * 'reason'. Only re-throws on unexpected infrastructure failures.
   */
  /**
   * Calculate and store final standings for a completed bracket.
   *
   * PR-06: standings are computed and written server-side by the
   * `finalize_bracket_standings` SQL function (fires automatically via
   * trigger on bracket completion). This client method now:
   *   1. Runs the best-effort self-heal pass (GF backfill / propagation)
   *      so admin "Recalculate Standings" can repair a stuck bracket.
   *   2. Pre-checks that all matches in the final stage are resolved.
   *   3. Invokes the admin-only RPC to (re)write playoff_team_records.
   *
   * No browser-side write to playoff_team_records occurs anywhere.
   */
  async calculateFinalStandings(bracketId: string): Promise<FinalStandingsResult> {
    bracketLog('Requesting server-side final standings:', { bracketId });

    try {
      // Get all stages for this bracket from SQL tables
      const stages = await this.storage.select('stage', { tournament_id: bracketId });

      if (!stages || (Array.isArray(stages) && stages.length === 0)) {
        warnLog('No stages found for bracket:', bracketId);
        return { written: false, reason: 'no-stages' };
      }

      const stagesArray = (Array.isArray(stages) ? stages : [stages]) as StorageStage[];
      // Use the final stage (highest number) for tournament standings
      const stage = [...stagesArray].sort((a, b) => b.number - a.number)[0];

      // Best-effort self-heal: walk any stuck WB/LB winners into the Grand Final
      // and backfill GF opponent slots before checking for incomplete matches.
      // This lets the "Recalculate Standings" button repair a bracket whose GF
      // never received its winners due to a silent brackets-manager failure.
      if (this.normalizationService) {
        try {
          await this.normalizationService.normalizeGrandFinalPopulation(stage.id);
          await this.normalizationService.propagateCompletedMatches(stage.id);
        } catch (healError) {
          warnLog('Pre-standings self-heal failed (continuing):', healError);
        }
      }

      // Pre-check: if any match is still unresolved, the bracket isn't done.
      const { data: stageMatches, error: stageMatchesError } = await supabase
        .from('match')
        .select('id, number, group_id, round_id, status, opponent1_id, opponent2_id')
        .eq('stage_id', stage.id);

      if (stageMatchesError) {
        errorLog('Failed to load stage matches for completion check:', stageMatchesError);
        // Fall through; the RPC will re-check server-side.
      } else {
        const unresolved = (stageMatches ?? []).filter(
          (m) =>
            (m.status ?? 0) < MATCH_STATUS_COMPLETED &&
            !(m.opponent1_id === null && m.opponent2_id === null)
        );
        if (unresolved.length > 0) {
          warnLog('Skipping final standings: bracket has unresolved matches', {
            bracketId,
            stageId: stage.id,
            unresolvedMatches: unresolved.map((m) => ({ id: m.id, status: m.status })),
          });
          return { written: false, reason: 'incomplete-matches' };
        }
      }

      // Server-side finalization: SECURITY DEFINER RPC computes placements
      // from the SQL tables and upserts playoff_team_records. Admin-only.
      const { data, error } = await supabase.rpc('finalize_bracket_standings', {
        p_bracket_id: bracketId,
      });

      if (error) {
        errorLog('finalize_bracket_standings RPC failed', { bracketId, error });
        return { written: false, reason: 'calculation-error' };
      }

      const rowsWritten = typeof data === 'number' ? data : 0;
      if (rowsWritten > 0) {
        successLog('Final standings written server-side', `${bracketId} (${rowsWritten} rows)`);
        return { written: true };
      }

      return { written: false, reason: 'no-records' };
    } catch (error) {
      failureLog('Failed to calculate final standings', error);
      throw new DatabaseError(
        `Final standings calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }
}
