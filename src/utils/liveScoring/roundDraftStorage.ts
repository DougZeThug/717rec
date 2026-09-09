import { warnLog } from '@/utils/logger';
import { parseStoredJson } from '@/utils/storage/parseStoredJson';

import type { SideSelection } from './types';

const STORAGE_PREFIX = 'liveRoundDraft:v1:';

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
  v: 1;
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

const isPersistedRoundDraft = (v: unknown): v is PersistedRoundDraft => {
  if (typeof v !== 'object' || v === null) return false;
  const draft = v as Record<string, unknown>;
  return (
    draft.v === 1 &&
    typeof draft.gameId === 'string' &&
    typeof draft.roundNumber === 'number' &&
    typeof draft.savedAt === 'number' &&
    isPersistedSide(draft.team1) &&
    isPersistedSide(draft.team2)
  );
};

const keyFor = (gameId: string) => `${STORAGE_PREFIX}${gameId}`;

const toSelection = (side: PersistedRoundDraft['team1']): SideSelection => ({
  score: side.score,
  bagsIn: side.bagsIn ?? undefined,
});

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
  try {
    const result = parseStoredJson(localStorage.getItem(keyFor(gameId)), isPersistedRoundDraft);
    if (!result.ok) {
      if (result.error !== 'missing') {
        warnLog('Discarding an unreadable live-scoring round draft:', result.error);
        clearRoundDraft(gameId);
      }
      return null;
    }

    const draft = result.value;
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearRoundDraft(gameId);
      return null;
    }
    if (draft.gameId !== gameId || draft.roundNumber !== roundNumber) return null;

    return {
      gameId: draft.gameId,
      roundNumber: draft.roundNumber,
      team1: toSelection(draft.team1),
      team2: toSelection(draft.team2),
    };
  } catch (error) {
    warnLog('Could not read the live-scoring round draft:', error);
    return null;
  }
};

/** Keeps the tapped round for a reload. Never throws; a full or blocked store just means no draft. */
export const saveRoundDraft = (draft: RoundDraft): void => {
  try {
    const persisted: PersistedRoundDraft = {
      v: 1,
      gameId: draft.gameId,
      roundNumber: draft.roundNumber,
      savedAt: Date.now(),
      team1: { score: draft.team1.score, bagsIn: draft.team1.bagsIn ?? null },
      team2: { score: draft.team2.score, bagsIn: draft.team2.bagsIn ?? null },
    };
    localStorage.setItem(keyFor(draft.gameId), JSON.stringify(persisted));
  } catch (error) {
    warnLog('Could not keep the live-scoring round draft:', error);
  }
};

/** Called once the round is really recorded, or once it belongs to somebody else. */
export const clearRoundDraft = (gameId: string): void => {
  try {
    localStorage.removeItem(keyFor(gameId));
  } catch (error) {
    warnLog('Could not clear the live-scoring round draft:', error);
  }
};
