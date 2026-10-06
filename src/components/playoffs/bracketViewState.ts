export type BracketViewState =
  | { kind: 'invalid-id' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'empty' }
  | { kind: 'corrupt'; matches: unknown }
  | { kind: 'ready'; matchesCount: number };

interface BracketViewStateInput {
  bracketId: string;
  isLoading: boolean;
  error: unknown;
  hasLegacyBracket: boolean;
  /** Truthy when the bracket comes from brackets-manager JSONB data. */
  isJsonbBracket: unknown;
  displayBracket: object | null | undefined;
}

/**
 * Decides what the bracket page shows. The order is the order the page has
 * always checked in, so when several things are true the user sees the same
 * screen: invalid id, loading, error, empty, corrupt data, then the bracket.
 * A bracket passed in by the parent, or JSONB data, hides loading and error.
 */
export const resolveBracketViewState = ({
  bracketId,
  isLoading,
  error,
  hasLegacyBracket,
  isJsonbBracket,
  displayBracket,
}: BracketViewStateInput): BracketViewState => {
  if (!bracketId || typeof bracketId !== 'string' || bracketId.trim() === '') {
    return { kind: 'invalid-id' };
  }

  const hasBracketAlready = hasLegacyBracket || Boolean(isJsonbBracket);
  if (isLoading && !hasBracketAlready) return { kind: 'loading' };
  if (error && !hasBracketAlready) return { kind: 'error' };
  if (!displayBracket) return { kind: 'empty' };

  const matches =
    'matches' in displayBracket ? (displayBracket as { matches?: unknown }).matches : undefined;
  if (!isJsonbBracket && (!matches || !Array.isArray(matches))) {
    return { kind: 'corrupt', matches };
  }

  return { kind: 'ready', matchesCount: (matches as { length?: number } | undefined)?.length || 0 };
};
