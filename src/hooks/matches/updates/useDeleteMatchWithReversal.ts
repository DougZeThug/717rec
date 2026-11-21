import { useMutation } from '@tanstack/react-query';

import { deleteMatchWithStatsReversal } from '@/services/matches/MatchWriteService';

/**
 * Delete a match and reverse its stats in one database transaction.
 *
 * The hook owns no toast and no refresh: the Mass Score Entry tool removes the
 * row, shows the toast, then refreshes the data queries, in that order. The
 * arrow wrapper is needed. TanStack calls `mutationFn(variables, context)`, so
 * a bare reference would pass an extra second argument to the service.
 *
 * `networkMode: 'always'` keeps the delete running while the browser is
 * offline. By default TanStack pauses an offline mutation. An offline delete
 * must fail at once, like before, not wait and run later.
 */
export const useDeleteMatchWithReversal = () =>
  useMutation({
    networkMode: 'always',
    mutationFn: (matchId: string) => deleteMatchWithStatsReversal(matchId),
  });
