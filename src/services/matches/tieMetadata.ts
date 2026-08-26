import type { Json } from '@/integrations/supabase/types';

/**
 * A completed match with no winner is already a tie in the database, so
 * confirming one has no result to write. Instead the match is stamped here,
 * in its `metadata`, so it leaves the admin's unresolved queue.
 */
export const TIE_CONFIRMED_AT = 'tie_confirmed_at';
export const TIE_CONFIRMED_BY = 'tie_confirmed_by';

/** Read a match's metadata as a plain object, ignoring any other JSON shape. */
export const asMetadataObject = (metadata: Json | null | undefined): Record<string, Json> =>
  metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, Json>)
    : {};

/** True when an admin has already confirmed this match really was a tie. */
export const isConfirmedTie = (metadata: Json | null | undefined): boolean =>
  Boolean(asMetadataObject(metadata)[TIE_CONFIRMED_AT]);
