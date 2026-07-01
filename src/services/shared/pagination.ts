import { handleDatabaseError } from '@/utils/errorHandler';

/**
 * PostgREST returns at most this many rows in a single response. Any query that
 * can exceed it must page through results, or rows past the cap vanish silently.
 */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Fetch every row of a query by paging through PostgREST's row cap.
 *
 * Supabase/PostgREST caps a single response at `pageSize` rows, so one query
 * silently truncates larger result sets. This helper calls `buildPage(from, to)`
 * with successive `.range()` windows and concatenates the pages until it gets a
 * short (non-full) page — the last one.
 *
 * IMPORTANT: `buildPage` MUST apply a stable, total ORDER BY (a unique column or
 * unique composite). Range pagination over an unstable order can skip or repeat
 * rows across page boundaries.
 *
 * @param buildPage Builds the query for one `.range(from, to)` window.
 * @param context   Message passed to `handleDatabaseError` if a page fails.
 * @param pageSize  Rows per page; defaults to PostgREST's cap.
 * @throws {DatabaseError} When any page returns an error.
 */
export async function fetchAllPages<Row>(
  buildPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>,
  context: string,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<Row[]> {
  const rows: Row[] = [];
  let from = 0;

  // Keep fetching pages until we get a short (non-full) page — that is the last one.
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildPage(from, to);
    if (error) handleDatabaseError(error as never, context);

    const page = data ?? [];
    rows.push(...page);

    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}
