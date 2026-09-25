import { BusinessLogicError, NotFoundError, ValidationError } from '@/types/errors';

import type { BracketAdminDeps } from '../types';
import { planEdit } from './plan';
import type { EditMatchTeamsParams } from './types';

export interface EditTeamsPreview {
  ok: boolean;
  /** Why the edit would be refused, in plain language. Empty when ok. */
  problems: string[];
  /** "Winners Round 1 Match 2 is now T4 vs BYE." — one line per changed match. */
  changes: string[];
  /** What would change automatically as a result. */
  consequences: string[];
}

/**
 * Read-only: what saving this edit would do, for the review step. Runs the
 * exact checks and plan the save runs (planEdit) and writes nothing. An edit
 * that would be refused comes back with its reason instead of throwing, so
 * the screen can show it; database failures still throw.
 */
export async function previewEditMatchTeams(
  deps: BracketAdminDeps,
  params: EditMatchTeamsParams
): Promise<EditTeamsPreview> {
  try {
    const plan = await planEdit(deps, params);
    return { ok: true, problems: [], changes: plan.changes, consequences: plan.consequences };
  } catch (error) {
    if (
      error instanceof ValidationError ||
      error instanceof BusinessLogicError ||
      error instanceof NotFoundError
    ) {
      return { ok: false, problems: [error.message], changes: [], consequences: [] };
    }
    throw error;
  }
}
