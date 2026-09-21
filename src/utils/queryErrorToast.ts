import { toast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';
import { metrics } from '@/utils/sentry';

/**
 * What the app does when any query fails: count it, and — for a query that
 * opted in with `meta.errorToast` — tell the user once.
 *
 * Wired into the QueryCache in `App.tsx`, so it runs **once per query failure,
 * after retries are exhausted**. The two obvious alternatives both misfire: a
 * toast inside `queryFn` runs once per attempt, so `retry: 1` doubles it and a
 * retry that succeeds still raises one; a toast in a hook effect runs once per
 * mounted consumer, and `usePendingScoresMatches` alone is mounted three times
 * on the home page.
 *
 * `meta.errorToast` is the lead-in phrase. `getUIErrorMessage` appends the
 * reason when the error carries one a user can act on — a ValidationError, a
 * NotFoundError, a recognised Postgres code — and otherwise uses the phrase on
 * its own with "Please try again.", rather than showing raw database internals.
 */
export const handleQueryError = (
  error: unknown,
  // Structural, not `Query<...>`: the two differ only in how they parameterise
  // the error type, and QueryCache.onError hands over a `Query<unknown, unknown>`
  // while QueryCache.getAll() gives a `Query<unknown, Error>`. This is every
  // field the handler reads, and both shapes satisfy it.
  query: { meta?: Record<string, unknown>; queryKey: readonly unknown[] }
) => {
  metrics.count('query_error', 1, { type: 'query' });

  const fallback = query.meta?.errorToast;
  if (typeof fallback !== 'string') return;

  errorLog(`Query failed: ${JSON.stringify(query.queryKey)}`, error);
  toast({
    title: 'Error',
    description: getUIErrorMessage(error, fallback),
    variant: 'destructive',
  });
};

/**
 * What the app does when any mutation fails: count it and log it, naming the
 * mutation key when one is set.
 *
 * Wired into the MutationCache in `App.tsx`. Deliberately silent — unlike a
 * query, a mutation is something the user asked for, so the code that started
 * it owns telling them how it went. This is the backstop that makes sure a
 * failure is never lost even when that code forgets.
 */
export const handleMutationError = (
  error: unknown,
  _variables: unknown,
  _context: unknown,
  // Structural, for the same reason as handleQueryError above: this is every
  // field the handler reads, and MutationCache.onError's argument satisfies it.
  // The two ignored parameters keep the shape MutationCache.onError expects, so
  // this can be handed over directly the way handleQueryError is.
  mutation: { options: { mutationKey?: readonly unknown[] } }
) => {
  metrics.count('mutation_error', 1, { type: 'mutation' });

  const keyLabel = mutation.options.mutationKey
    ? `: ${JSON.stringify(mutation.options.mutationKey)}`
    : '';
  errorLog(`Mutation failed${keyLabel}`, error);
};
