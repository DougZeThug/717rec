import { warnLog } from '@/utils/logger';
import { parseStoredJson } from '@/utils/storage/parseStoredJson';

import type { SideSelection } from './types';

const STORAGE_PREFIX = 'liveRoundDraft:v2:';

/** Keys written before drafts were kept per round: one slot for a whole game. */
const LEGACY_PREFIX = 'liveRoundDraft:v1:';

/** After this long a draft is last week's match, not this round. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * A round the scorer has tapped in but not yet filed.
 *
 * `bagsIn` is `undefined` in memory and JSON has no `undefined`, so it is
 * stored as `null` and mapped back on the way out.
 */
export interface RoundDraft {
  gameId: string;
  roundNumber: number;
  team1: SideSelection;
  team2: SideSelection;
}

interface PersistedRoundDraft {
  v: 2;
  gameId: string;
  roundNumber: number;
  savedAt: number;
  team1: { score: number | null; bagsIn: number | null };
  team2: { score: number | null; bagsIn: number | null };
}

const isPersistedSide = (v: unknown): v is PersistedRoundDraft['team1'] => {
  if (typeof v !== 'object' || v === null) return false;
  const side = v as Record<string, unknown>;
  const scoreOk = side.score === null || typeof side.score === 'number';
  const bagsOk = side.bagsIn === null || typeof side.bagsIn === 'number';
  return scoreOk && bagsOk;
};

/** Everything but the version, which is all the two shapes differ by. */
const hasDraftFields = (v: unknown): v is Omit<PersistedRoundDraft, 'v'> => {
  if (typeof v !== 'object' || v === null) return false;
  const draft = v as Record<string, unknown>;
  return (
    typeof draft.gameId === 'string' &&
    typeof draft.roundNumber === 'number' &&
    typeof draft.savedAt === 'number' &&
    isPersistedSide(draft.team1) &&
    isPersistedSide(draft.team2)
  );
};

const isPersistedRoundDraft = (v: unknown): v is PersistedRoundDraft =>
  hasDraftFields(v) && (v as { v?: unknown }).v === 2;

/** A draft written by a build from before drafts were kept per round. */
const isLegacyRoundDraft = (v: unknown): v is Omit<PersistedRoundDraft, 'v'> =>
  hasDraftFields(v) && (v as { v?: unknown }).v === 1;

/**
 * One slot per round, not one per game.
 *
 * A round filed with no signal keeps its copy, because that copy is the only
 * way back if the tab dies before the connection returns — but the round number
 * moves on the moment the save is queued, so the scorer is tapping the next
 * round while the last one is still held. With one slot per game the next
 * round's first tap wrote over the held round's only copy.
 */
const keyFor = (gameId: string, roundNumber: number) => `${STORAGE_PREFIX}${gameId}:${roundNumber}`;

const legacyKeyFor = (gameId: string) => `${LEGACY_PREFIX}${gameId}`;

const toSelection = (side: PersistedRoundDraft['team1']): SideSelection => ({
  score: side.score,
  bagsIn: side.bagsIn ?? undefined,
});

/** Called once the round is really recorded, or once it belongs to somebody else. */
export const clearRoundDraft = (gameId: string, roundNumber: number): void => {
  try {
    localStorage.removeItem(keyFor(gameId, roundNumber));
  } catch (error) {
    warnLog('Could not clear the live-scoring round draft:', error);
  }
};

/**
 * Drop every draft that can no longer be wanted.
 *
 * Per-round slots mean a game can leave more than one behind — a held offline
 * round keeps its copy until the round number comes back to it, which for a
 * round that finally reached the league is never. This collects those on the
 * twelve-hour cutoff, along with anything unreadable and every key written
 * under the old one-slot-per-game scheme.
 *
 * `skipKey` is the draft the caller is about to hand back, so a mistake in here
 * can never eat the round a scorer is being offered.
 */
export const pruneRoundDrafts = (skipKey?: string): void => {
  try {
    // Snapshot first: removing while walking `localStorage.length` shifts the
    // indexes and skips entries.
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key !== null) keys.push(key);
    }

    for (const key of keys) {
      if (key === skipKey) continue;

      if (key.startsWith(LEGACY_PREFIX)) {
        localStorage.removeItem(key);
        continue;
      }
      if (!key.startsWith(STORAGE_PREFIX)) continue;

      const result = parseStoredJson(localStorage.getItem(key), isPersistedRoundDraft);
      if (!result.ok || Date.now() - result.value.savedAt > MAX_AGE_MS) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    // Its own catch, not the caller's: a sweep that throws must never turn a
    // readable draft into "no draft".
    warnLog('Could not tidy the live-scoring round drafts:', error);
  }
};

/**
 * The draft a build from before per-round keys left behind, if it is this round.
 *
 * A scorer mid-round when the release lands reloads into a build that reads a
 * different key, and their taps are still under the old one. Read it on the way
 * past and move it across rather than letting the sweep take it: losing a round
 * to a deploy is the exact loss the copy exists to prevent.
 */
const claimLegacyDraft = (gameId: string, roundNumber: number): PersistedRoundDraft | null => {
  const result = parseStoredJson(localStorage.getItem(legacyKeyFor(gameId)), isLegacyRoundDraft);
  if (!result.ok) return null;

  const draft = result.value;
  // Stale, another game's, or a round that has moved on: not this scorer's work
  // any more. Left in place for the sweep.
  if (Date.now() - draft.savedAt > MAX_AGE_MS) return null;
  if (draft.gameId !== gameId || draft.roundNumber !== roundNumber) return null;

  const migrated: PersistedRoundDraft = { ...draft, v: 2 };
  localStorage.setItem(keyFor(gameId, roundNumber), JSON.stringify(migrated));
  localStorage.removeItem(legacyKeyFor(gameId));
  return migrated;
};

/**
 * The tapped round for this game, if one was left behind and it is still the
 * round being played.
 *
 * A draft for an earlier round is not the scorer's work any more — somebody
 * recorded that round while they were away — so it is dropped rather than
 * re-offered under the wrong number.
 *
 * `localStorage`, not `sessionStorage`: the case this exists for is a phone at
 * a venue whose screen locked and whose browser then reclaimed the tab, and
 * session storage does not always come back from that. The twelve-hour cutoff
 * is what stops it resurrecting last week's league night instead.
 */
export const loadRoundDraft = (gameId: string, roundNumber: number): RoundDraft | null => {
  const key = keyFor(gameId, roundNumber);
  try {
    const result = parseStoredJson(localStorage.getItem(key), isPersistedRoundDraft);
    if (!result.ok) {
      if (result.error !== 'missing') {
        warnLog('Discarding an unreadable live-scoring round draft:', result.error);
        clearRoundDraft(gameId, roundNumber);
        return null;
      }
      // Nothing under the new key yet. A build before this one may still have
      // left this round under the old one.
      const migrated = claimLegacyDraft(gameId, roundNumber);
      if (!migrated) return null;
      return {
        gameId: migrated.gameId,
        roundNumber: migrated.roundNumber,
        team1: toSelection(migrated.team1),
        team2: toSelection(migrated.team2),
      };
    }

    const draft = result.value;
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearRoundDraft(gameId, roundNumber);
      return null;
    }
    // The key already names the game and the round, so this can only fire on a
    // payload that contradicts the key it was stored under. Kept as a
    // corruption check: handing back somebody else's round is worse than
    // handing back nothing.
    if (draft.gameId !== gameId || draft.roundNumber !== roundNumber) {
      clearRoundDraft(gameId, roundNumber);
      return null;
    }

    return {
      gameId: draft.gameId,
      roundNumber: draft.roundNumber,
      team1: toSelection(draft.team1),
      team2: toSelection(draft.team2),
    };
  } catch (error) {
    warnLog('Could not read the live-scoring round draft:', error);
    return null;
  } finally {
    // After the read, never before: the draft being handed back is skipped, so
    // the sweep cannot take it.
    pruneRoundDrafts(key);
  }
};

/** Keeps the tapped round for a reload. Never throws; a full or blocked store just means no draft. */
export const saveRoundDraft = (draft: RoundDraft): void => {
  try {
    const persisted: PersistedRoundDraft = {
      v: 2,
      gameId: draft.gameId,
      roundNumber: draft.roundNumber,
      savedAt: Date.now(),
      team1: { score: draft.team1.score, bagsIn: draft.team1.bagsIn ?? null },
      team2: { score: draft.team2.score, bagsIn: draft.team2.bagsIn ?? null },
    };
    localStorage.setItem(keyFor(draft.gameId, draft.roundNumber), JSON.stringify(persisted));
  } catch (error) {
    warnLog('Could not keep the live-scoring round draft:', error);
  }
};
