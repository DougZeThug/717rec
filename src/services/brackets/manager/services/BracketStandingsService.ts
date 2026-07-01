import { BracketsManager } from 'brackets-manager';

import { supabase } from '@/integrations/supabase/client';
import { DatabaseError } from '@/types/errors';
import { bracketLog, errorLog, failureLog, successLog, warnLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../SupabaseSqlStorage';
import type { StorageParticipant, StorageStage } from '../types/BracketServiceTypes';
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
  async calculateFinalStandings(bracketId: string): Promise<FinalStandingsResult> {
    bracketLog('Calculating final standings from SQL tables:', { bracketId });

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
          // Run normalization first so GF slots are populated with the canonical
          // mapping (WB winner → opponent1, LB winner → opponent2) before the
          // propagation repair pass walks any remaining stuck winners.
          await this.normalizationService.normalizeGrandFinalPopulation(stage.id);
          await this.normalizationService.propagateCompletedMatches(stage.id);
        } catch (healError) {
          warnLog('Pre-standings self-heal failed (continuing):', healError);
        }
      }

      // Pre-check: if any match in this stage is still unresolved (status < 4),
      // the bracket isn't really done and brackets-manager will throw obscure
      // "Participant not found" errors while walking the losers bracket. Bail
      // cleanly so the caller can show a friendly message.
      const { data: stageMatches, error: stageMatchesError } = await supabase
        .from('match')
        .select('id, number, group_id, round_id, status, opponent1_id, opponent2_id')
        .eq('stage_id', stage.id);

      if (stageMatchesError) {
        errorLog('Failed to load stage matches for completion check:', stageMatchesError);
        // Fall through; brackets-manager may still succeed.
      } else {
        const unresolved = (stageMatches ?? []).filter(
          (m) => (m.status ?? 0) < MATCH_STATUS_COMPLETED
        );
        if (unresolved.length > 0) {
          warnLog('Skipping final standings: bracket has unresolved matches', {
            bracketId,
            stageId: stage.id,
            unresolvedMatches: unresolved.map((m) => ({
              id: m.id,
              number: m.number,
              group_id: m.group_id,
              round_id: m.round_id,
              status: m.status,
              opponent1_id: m.opponent1_id,
              opponent2_id: m.opponent2_id,
            })),
          });
          return { written: false, reason: 'incomplete-matches' };
        }
      }

      // Get final standings from brackets-manager.
      // This can throw "Participant not found" when the bracket has dangling
      // opponent references (e.g. a BYE slot the library couldn't resolve).
      // Swallow those — they aren't actionable for the user.
      interface FinalStanding {
        id: number;
        name: string;
        rank: number;
      }
      let finalStandings: FinalStanding[];
      try {
        finalStandings = (await this.manager.get.finalStandings(stage.id)) as FinalStanding[];
      } catch (calcError) {
        errorLog('brackets-manager.finalStandings threw — skipping standings write', {
          bracketId,
          stageId: stage.id,
          error: calcError instanceof Error ? calcError.message : String(calcError),
        });
        return { written: false, reason: 'calculation-error' };
      }

      bracketLog('Final standings calculated:', {
        stageId: stage.id,
        standings: finalStandings,
      });

      // Get participants to map back to team IDs
      const participants = await this.storage.select('participant', {
        tournament_id: bracketId,
      });

      if (!participants) {
        errorLog('No participants found for bracket:', bracketId);
        return { written: false, reason: 'no-records' };
      }

      const participantArray = (
        Array.isArray(participants) ? participants : [participants]
      ) as StorageParticipant[];

      // Create a Map for O(1) lookups by participant ID
      const participantMap = new Map<number, StorageParticipant>();
      participantArray.forEach((p) => {
        participantMap.set(p.id, p);
      });

      // Update playoff_team_records
      const recordUpdates = finalStandings
        .map((standing) => {
          const participant = participantMap.get(standing.id);
          return {
            team_id: participant?.team_id,
            bracket_id: bracketId,
            placement: standing.rank,
          };
        })
        .filter((r) => r.team_id);

      if (recordUpdates.length > 0) {
        const { error } = await supabase.from('playoff_team_records').upsert(recordUpdates, {
          onConflict: 'team_id,bracket_id',
        });

        if (error) {
          errorLog('Error updating playoff team records:', error);
          throw error;
        }

        successLog('Final standings updated in playoff_team_records', bracketId);
        return { written: true };
      }

      return { written: false, reason: 'no-records' };
    } catch (error) {
      failureLog(
        'Failed to calculate final standings',
        error instanceof Error ? error : String(error)
      );
      throw new DatabaseError(
        `Final standings calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }
}
