import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { bracketLog } from '@/utils/logger';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import type { StorageMatch, StorageStage } from '../../types/BracketServiceTypes';
import { computeLbFeederMarkers } from '../../utils/lbFeederMarkers';
import type { MatchUpdateFields } from '../BracketAdmin/shapes';
import { LbStructureService } from './LbStructureService';

const SIDES = ['opponent1', 'opponent2'] as const;

/**
 * Repair-only pass (invoked via the admin Repair Bracket action): puts every
 * losers-bracket slot's feeder marker (`opponentN_position`) back to the value
 * brackets-manager gives that slot.
 *
 * The library reads a losers-bracket slot's marker to look up the
 * winners-bracket match that feeds it, so a wrong marker makes scoring fail
 * ("Match not found." / "Position is undefined."). Markers went wrong when
 * older versions of the rearrange and swap tools moved them with teams, and
 * when the losers round 1 normalization shifted a team between slots.
 *
 * Team and empty (TBD) slots are corrected; BYE slots are left as stored (the
 * library never reads them), as are the winners bracket and the grand final.
 * Errors are thrown loudly.
 */
export class LbFeederMarkerRepairService {
  constructor(
    private storage: SupabaseSqlStorage,
    private lbStructureService: LbStructureService
  ) {}

  /** Returns how many matches had a marker corrected. */
  async repairLbFeederMarkers(stageId: number): Promise<number> {
    const stage = (await this.storage.select('stage', stageId)) as unknown as StorageStage | null;
    if (stage?.type !== 'double_elimination') return 0;

    const lbGroup = await this.lbStructureService.findLbGroup(stageId);
    if (!lbGroup) return 0;

    const feederMarkers = await computeLbFeederMarkers(stage);
    const rounds = await this.lbStructureService.findGroupRounds(lbGroup.id);
    const roundNumberById = new Map(rounds.map((round) => [round.id, round.number]));

    const matches = await this.storage.select('match', { group_id: lbGroup.id });
    const matchesArray = (
      Array.isArray(matches) ? matches : matches ? [matches] : []
    ) as StorageMatch[];

    let repaired = 0;
    // Sequential on purpose, like the other repair passes: a failure part-way
    // through leaves a clear, loggable point to resume from.
    for (const match of matchesArray) {
      const roundNumber = roundNumberById.get(match.round_id);
      if (roundNumber === undefined) continue;

      const fields: MatchUpdateFields = {};
      for (const side of SIDES) {
        const slot = match[side];
        if (slot == null) continue; // A BYE: the library never reads its marker.
        const expected = feederMarkers.markerOf(roundNumber, match.number, side);
        if ((slot.position ?? null) !== expected) fields[`${side}_position`] = expected;
      }
      if (Object.keys(fields).length === 0) continue;

      const { error } = await supabase.from('match').update(fields).eq('id', match.id);
      if (error) {
        handleDatabaseError(error, `Failed to restore the feeder markers of match ${match.id}`);
      }
      bracketLog(`Restored feeder markers of match ${match.id}`, fields);
      repaired += 1;
    }
    return repaired;
  }
}
