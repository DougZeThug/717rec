import type { Query } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import { getUIErrorMessage } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';

/**
 * Raise one failure toast for a query that opted in with `meta.errorToast`.
 *
 * Wired into the QueryCache in `App.tsx`, so it runs **once per query failure,
 * after retries are exhausted**. The two obvious alternatives both misfire: a
 * toast inside `queryFn` runs once per attempt, so `retry: 1` doubles it and a
 * retry that succeeds still raises one; a toast in a hook effect runs once per
 * mounted consumer, and `usePendingScoresMatches` alone is mounted three times
 * on the home page.
 *
 * `meta.errorToast` is the fallback wording. The server's own message wins when
 * there is one, via `getUIErrorMessage`.
 */
export const notifyQueryError = (
  error: unknown,
  query: Query<unknown, unknown, unknown, readonly unknown[]>
) => {
  const fallback = query.meta?.errorToast;
  if (typeof fallback !== 'string') return;

  errorLog(`Query failed: ${JSON.stringify(query.queryKey)}`, error);
  toast({
    title: 'Error',
    description: getUIErrorMessage(error, fallback),
    variant: 'destructive',
  });
};
