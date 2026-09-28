import { ValidationError } from '@/types/errors';

import type { SupabaseSqlStorage } from '../../SupabaseSqlStorage';
import { transformMatchFromDb, transformMatchToDb } from '../../SupabaseSqlStorage/matchTransforms';
import type { BmMatch, DbMatch } from '../../SupabaseSqlStorage/types';
import type { StorageMatch } from '../../types/BracketServiceTypes';
import { resolveWinnerPlacement } from './placement';
import { loadRearrangeBoard } from './rearrange/board';
import type { MatchUpdateFields } from './shapes';
import { idField } from './shapes';
import type { BracketAdminDeps } from './types';

/** The writes a swap is about to make, in the order it makes them. */
export interface PlannedSwapWrites {
  /** Column writes, as sent to the match table. */
  writes: { matchId: number; fields: MatchUpdateFields }[];
  /** Matches the swap turns into walkovers. Each winner then advances a round. */
  walkovers: { match: StorageMatch; winnerId: number }[];
}

/** A match as storage would read it back after these column writes. */
const withWrites = (match: StorageMatch, fields: MatchUpdateFields): StorageMatch =>
  transformMatchFromDb({
    ...transformMatchToDb(match as unknown as BmMatch),
    ...fields,
  } as DbMatch) as unknown as StorageMatch;

/**
 * A read-only view of storage with the pending writes laid over every match it
 * returns. Nothing is written: reads go to the real storage, and only the
 * returned rows change.
 */
function previewStorage(
  storage: SupabaseSqlStorage,
  pending: Map<number, MatchUpdateFields>
): SupabaseSqlStorage {
  const patch = (row: unknown): unknown => {
    const match = row as StorageMatch;
    const fields = pending.get(match.id);
    return fields ? withWrites(match, fields) : match;
  };
  const preview = Object.create(storage) as SupabaseSqlStorage;
  preview.select = (async (table: string, filter?: unknown) => {
    const result: unknown = await storage.select(table as 'match', filter as number);
    if (table !== 'match' || result == null) return result;
    return Array.isArray(result) ? result.map(patch) : patch(result);
  }) as SupabaseSqlStorage['select'];
  return preview;
}

/**
 * Refuse a swap that would leave a team in two spots the Rearrange tool can
 * move.
 *
 * The swap only checks its own round. A team that reached a minor round's
 * carry slot by walkover also still sits in its feeder match one round back,
 * and Rearrange counts it there, because the carry slot fills itself. Moving
 * that team into a drop-in slot, which does not fill itself, makes Rearrange
 * count it twice. Rearrange then refuses every save, and no drag can fix it.
 *
 * So this builds the Rearrange board as it would look after the swap, using
 * the board's own rules, and counts each touched team over the spots it would
 * offer. Read-only; it runs before the first write.
 */
export async function assertSwapKeepsTeamsUnique(
  deps: BracketAdminDeps,
  bracketId: string,
  planned: PlannedSwapWrites,
  touchedTeamIds: number[],
  nameOf: (participantId: number) => string
): Promise<void> {
  const pending = new Map<number, MatchUpdateFields>();
  const addWrite = (matchId: number, fields: MatchUpdateFields) =>
    pending.set(matchId, { ...pending.get(matchId), ...fields });

  for (const { matchId, fields } of planned.writes) addWrite(matchId, fields);

  const preview: BracketAdminDeps = { storage: previewStorage(deps.storage, pending) };

  // Sequential, like the real placements: a second walkover can land in the
  // same next-round match, and must see the first one's spot as taken.
  for (const { match, winnerId } of planned.walkovers) {
    const placement = await resolveWinnerPlacement(preview, match, winnerId);
    if (!placement) continue;
    addWrite(placement.nextMatch.id, {
      ...idField(placement.slot, winnerId),
      ...(placement.markReady ? { status: 2 } : {}),
    });
  }

  const board = await loadRearrangeBoard(preview, bracketId);

  const spotCounts = new Map<number, number>();
  for (const match of board.snapshot.matches) {
    for (const slot of [match.opponent1, match.opponent2]) {
      if (!slot.isOrigin || slot.shape !== 'team' || slot.participantId == null) continue;
      spotCounts.set(slot.participantId, (spotCounts.get(slot.participantId) ?? 0) + 1);
    }
  }

  for (const participantId of new Set(touchedTeamIds)) {
    if ((spotCounts.get(participantId) ?? 0) > 1) {
      throw new ValidationError(
        `This swap would put ${nameOf(participantId)} in two losers-bracket spots at once. ` +
          'Choose a different spot.'
      );
    }
  }
}
