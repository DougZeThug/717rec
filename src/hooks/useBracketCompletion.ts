import { useEffect, useRef } from 'react';

import { subscribeWithRetry } from '@/hooks/realtime/subscribeWithRetry';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/utils/logger';

/** Bracket record from realtime payload */
interface BracketPayload {
  state: string;
  uses_brackets_manager: boolean;
}

/**
 * Display-only bracket-completion listener (PR-06).
 *
 * Standings are now written server-side by the `finalize_bracket_standings`
 * SQL trigger — no browser needs to be open. This hook exists solely to
 * surface a friendly toast when a viewer sees the bracket transition to
 * completed. It never writes to `playoff_team_records`.
 */
export function useBracketCompletion(bracketId: string | undefined) {
  const { toast } = useToast();
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!bracketId) return;
    notifiedRef.current = false;

    log('useBracketCompletion listening', { bracketId });

    const { dispose } = subscribeWithRetry({
      label: `useBracketCompletion(${bracketId})`,
      build: () =>
        supabase.channel(`bracket-${bracketId}-${Date.now()}`).on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'brackets',
            filter: `id=eq.${bracketId}`,
          },
          (payload) => {
            const bracket = payload.new as BracketPayload;
            if (
              bracket.state === 'completed' &&
              bracket.uses_brackets_manager &&
              !notifiedRef.current
            ) {
              notifiedRef.current = true;
              toast({
                title: 'Tournament Complete!',
                description: 'Final standings have been calculated.',
              });
            }
          }
        ),
    });

    return () => {
      dispose();
    };
  }, [bracketId, toast]);
}
