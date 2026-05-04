import { bracketLog } from '@/utils/logger';

import type { BmMatch, BmOpponentSlot, DbMatch, ParticipantCacheEntry } from './types';

/**
 * Helper: Defensive merge to prevent null from overwriting filled opponent slots
 */
export function mergeOpponentSlots(prev: DbMatch | null, patch: DbMatch): DbMatch {
  const out = { ...patch };

  for (const slot of ['opponent1_id', 'opponent2_id'] as const) {
    if (slot in patch) {
      const incoming = patch[slot];
      // If incoming is null but previous slot has a value, don't overwrite
      if (incoming === null && prev?.[slot] != null) {
        bracketLog(`Defensive merge: Prevented null overwrite of ${slot}`);
        delete out[slot];
      }
    }
  }

  return out;
}

/**
 * Transform match data from brackets-manager format to SQL format
 * Flattens opponent1/opponent2 objects into separate columns
 */
export function transformMatchToDb(data: BmMatch): DbMatch {
  const transformed: DbMatch = { ...data };

  // Handle opponent1 - always transform, even if null/undefined
  if ('opponent1' in data) {
    if (data.opponent1 && typeof data.opponent1 === 'object') {
      transformed.opponent1_id = data.opponent1.id ?? null;
      transformed.opponent1_score = data.opponent1.score ?? null;
      transformed.opponent1_result = data.opponent1.result ?? null;
    } else {
      // opponent1 is null/undefined (BYE case) - set all fields to null
      transformed.opponent1_id = null;
      transformed.opponent1_score = null;
      transformed.opponent1_result = null;
    }
    delete (transformed as BmMatch).opponent1;
  }

  // Handle opponent2 - always transform, even if null/undefined
  if ('opponent2' in data) {
    if (data.opponent2 && typeof data.opponent2 === 'object') {
      transformed.opponent2_id = data.opponent2.id ?? null;
      transformed.opponent2_score = data.opponent2.score ?? null;
      transformed.opponent2_result = data.opponent2.result ?? null;
    } else {
      // opponent2 is null/undefined (BYE case) - set all fields to null
      transformed.opponent2_id = null;
      transformed.opponent2_score = null;
      transformed.opponent2_result = null;
    }
    delete (transformed as BmMatch).opponent2;
  }

  return transformed;
}

/**
 * Transform match data from SQL format to brackets-manager format
 * Re-inflates separate columns into opponent1/opponent2 objects
 * Includes position field from participant cache for proper bracket routing
 */
export function transformMatchFromDb(
  data: DbMatch,
  participantCache: Map<number, ParticipantCacheEntry>
): BmMatch {
  const transformed: BmMatch & DbMatch = { ...data };

  if ('opponent1_id' in data || 'opponent1_score' in data || 'opponent1_result' in data) {
    const opponentId = data.opponent1_id;
    const cached = opponentId ? participantCache.get(opponentId) : null;

    transformed.opponent1 = {
      id: opponentId ?? null,
      position: cached?.position ?? undefined,
      score: data.opponent1_score ?? null,
      result: (data.opponent1_result as BmOpponentSlot['result']) ?? null,
    };
    delete transformed.opponent1_id;
    delete transformed.opponent1_score;
    delete transformed.opponent1_result;
  }

  if ('opponent2_id' in data || 'opponent2_score' in data || 'opponent2_result' in data) {
    const opponentId = data.opponent2_id;
    const cached = opponentId ? participantCache.get(opponentId) : null;

    transformed.opponent2 = {
      id: opponentId ?? null,
      position: cached?.position ?? undefined,
      score: data.opponent2_score ?? null,
      result: (data.opponent2_result as BmOpponentSlot['result']) ?? null,
    };
    delete transformed.opponent2_id;
    delete transformed.opponent2_score;
    delete transformed.opponent2_result;
  }

  return transformed;
}
