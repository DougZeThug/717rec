import type { BmMatch, BmOpponentSlot, DbMatch } from './types';

/**
 * Sentinel stored in the opponent result column for a strict BYE slot.
 *
 * brackets-manager distinguishes `opponent === null` (a BYE — no participant
 * will ever occupy the slot) from `opponent = { id: null }` (TBD — a
 * participant arrives once upstream matches resolve). The SQL schema flattens
 * both to a NULL id column, which erased the distinction on re-read and made
 * the library mis-evaluate BYE matches (the root cause of the old repair
 * layer). Persisting 'bye' in the otherwise-unused result column of the BYE
 * side makes the round-trip faithful. Legacy rows without the sentinel read
 * back as TBD, exactly as they did before.
 */
export const BYE_RESULT_SENTINEL = 'bye';

/**
 * Flatten one opponent slot into its columns. The slot's `position` is the
 * library's structural origin marker (which feeder match the participant
 * arrives from) — persisted verbatim, never invented.
 */
function flattenOpponentSlot(
  transformed: DbMatch,
  side: 'opponent1' | 'opponent2',
  slot: BmOpponentSlot | null | undefined
): void {
  const idColumn = `${side}_id` as 'opponent1_id' | 'opponent2_id';
  const scoreColumn = `${side}_score` as 'opponent1_score' | 'opponent2_score';
  const resultColumn = `${side}_result` as 'opponent1_result' | 'opponent2_result';
  const positionColumn = `${side}_position` as 'opponent1_position' | 'opponent2_position';

  if (slot && typeof slot === 'object') {
    transformed[idColumn] = slot.id ?? null;
    transformed[scoreColumn] = slot.score ?? null;
    transformed[resultColumn] = slot.result ?? null;
    transformed[positionColumn] = slot.position ?? null;
  } else {
    // Strictly null/undefined — a BYE slot.
    transformed[idColumn] = null;
    transformed[scoreColumn] = null;
    transformed[resultColumn] = BYE_RESULT_SENTINEL;
    transformed[positionColumn] = null;
  }
}

/**
 * Transform match data from brackets-manager format to SQL format
 * Flattens opponent1/opponent2 objects into separate columns
 */
export function transformMatchToDb(data: BmMatch): DbMatch {
  const transformed: DbMatch = { ...data };

  if ('opponent1' in data) {
    flattenOpponentSlot(transformed, 'opponent1', data.opponent1);
    delete (transformed as BmMatch).opponent1;
  }

  if ('opponent2' in data) {
    flattenOpponentSlot(transformed, 'opponent2', data.opponent2);
    delete (transformed as BmMatch).opponent2;
  }

  return transformed;
}

/**
 * Re-inflate one flattened opponent slot into brackets-manager shape.
 *
 * Faithfulness rules (the library's semantics depend on all three):
 *  - a stored 'bye' sentinel inflates to a strict `null` slot;
 *  - score/result/position keys are OMITTED when their columns are NULL —
 *    the library reads `score !== undefined` as "match started" and
 *    `position` as the structural feeder marker;
 *  - nothing is substituted from other sources (the old adapter injected the
 *    participant's SEED position here, fabricating wrong feeder lookups).
 */
function inflateOpponentSlot(
  id: number | null | undefined,
  score: number | null | undefined,
  result: string | null | undefined,
  position: number | null | undefined
): BmOpponentSlot | null {
  if (result === BYE_RESULT_SENTINEL) return null;

  const slot: BmOpponentSlot = { id: id ?? null };
  if (position !== null && position !== undefined) slot.position = position;
  if (score !== null && score !== undefined) slot.score = score;
  if (result !== null && result !== undefined) {
    slot.result = result as BmOpponentSlot['result'];
  }
  return slot;
}

/**
 * Transform match data from SQL format to brackets-manager format
 * Re-inflates separate columns into opponent1/opponent2 objects
 */
export function transformMatchFromDb(data: DbMatch): BmMatch {
  const transformed: BmMatch & DbMatch = { ...data };

  if ('opponent1_id' in data || 'opponent1_score' in data || 'opponent1_result' in data) {
    transformed.opponent1 = inflateOpponentSlot(
      data.opponent1_id,
      data.opponent1_score,
      data.opponent1_result,
      data.opponent1_position
    );
    delete transformed.opponent1_id;
    delete transformed.opponent1_score;
    delete transformed.opponent1_result;
    delete transformed.opponent1_position;
  }

  if ('opponent2_id' in data || 'opponent2_score' in data || 'opponent2_result' in data) {
    transformed.opponent2 = inflateOpponentSlot(
      data.opponent2_id,
      data.opponent2_score,
      data.opponent2_result,
      data.opponent2_position
    );
    delete transformed.opponent2_id;
    delete transformed.opponent2_score;
    delete transformed.opponent2_result;
    delete transformed.opponent2_position;
  }

  return transformed;
}
