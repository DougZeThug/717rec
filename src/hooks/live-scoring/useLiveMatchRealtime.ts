import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { supabase } from '@/integrations/supabase/client';
import type { LiveMatchBundle } from '@/services/liveScoring/LiveMatchService';

import { liveScoringKeys } from './liveScoringKeys';

interface RoundInsertPayload {
  game_id?: string;
  round_number?: number;
  team1_score?: number;
  team2_score?: number;
}

interface DeletedRowPayload {
  match_id?: string;
  game_id?: string;
}

/**
 * Keeps the live-match bundle in sync across devices: any change to this
 * match's rounds, games, player selections, or the match row invalidates the
 * bundle query. Our own writes are skipped via a cheap value-equality check
 * (the optimistic cache already contains the row the echo describes).
 *
 * DELETE events cannot be server-filtered by postgres_changes, so those are
 * subscribed unfiltered and matched client-side (REPLICA IDENTITY FULL on
 * match_rounds makes the old row's match_id available).
 */
export function useLiveMatchRealtime(matchId: string | undefined) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('connecting');

  useEffect(() => {
    if (!matchId) return undefined;

    const queryKey = liveScoringKeys.liveMatch(matchId);
    const invalidate = () => queryClient.invalidateQueries({ queryKey });

    const onRoundInsert = (row: RoundInsertPayload) => {
      const bundle = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      const isEcho = bundle?.rounds.some(
        (r) =>
          r.game_id === row.game_id &&
          r.round_number === row.round_number &&
          r.team1_score === row.team1_score &&
          r.team2_score === row.team2_score
      );
      if (!isEcho) invalidate();
    };

    // Unfiltered DELETE: only refetch when the old row belonged to this
    // match (or when we can't tell, e.g. only the primary key is present).
    const onRoundDelete = (oldRow: DeletedRowPayload) => {
      if (oldRow.match_id === undefined || oldRow.match_id === matchId) invalidate();
    };

    // game_players has no match_id column to filter on; check the game ids
    // in the cached bundle instead (fall back to refetching when unsure).
    const isThisMatchGame = (row: DeletedRowPayload) => {
      if (!row.game_id) return true;
      const bundle = queryClient.getQueryData<LiveMatchBundle>(queryKey);
      if (!bundle) return true;
      return bundle.games.some((g) => g.id === row.game_id);
    };
    const onGamePlayersChange = (row: DeletedRowPayload) => {
      if (isThisMatchGame(row)) invalidate();
    };

    const { dispose } = subscribeWithRetry({
      label: 'useLiveMatchRealtime',
      build: () =>
        supabase
          .channel(`live-match-${matchId}-${Math.random().toString(36).slice(2)}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'match_rounds',
              filter: `match_id=eq.${matchId}`,
            },
            (payload) => onRoundInsert(payload.new as RoundInsertPayload)
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'match_rounds' },
            (payload) => onRoundDelete(payload.old as DeletedRowPayload)
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'match_rounds',
              filter: `match_id=eq.${matchId}`,
            },
            invalidate
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'games', filter: `match_id=eq.${matchId}` },
            invalidate
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'game_players' },
            (payload) =>
              onGamePlayersChange((payload.new ?? payload.old ?? {}) as DeletedRowPayload)
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
            invalidate
          ),
      onReconnect: (isFirstConnect) => {
        // Resync after a dropped connection — events may have been missed.
        if (!isFirstConnect) invalidate();
      },
      onStatus: setStatus,
    });

    return () => dispose();
  }, [matchId, queryClient]);

  return { status };
}
