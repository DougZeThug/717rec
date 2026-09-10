import { useMutationState } from '@tanstack/react-query';

import { liveScoringKeys } from './liveScoringKeys';

/**
 * How many rounds are parked, waiting for the signal to come back.
 *
 * A save fired with no connection is not a failure: TanStack Query holds it,
 * with its optimistic round already in the log, and sends it the moment the
 * browser reports a connection. Nothing on screen said so, which is the whole
 * of UX audit LS-03 — a scorer at a venue could not tell a held round from a
 * lost one.
 *
 * The selector returns a boolean rather than the state object so the array this
 * produces is stable between renders and does not re-render the panel on every
 * unrelated cache change.
 */
export const usePausedRoundCount = (matchId: string): number => {
  const paused = useMutationState({
    filters: { mutationKey: liveScoringKeys.submitRound(matchId), status: 'pending' },
    select: (mutation) => mutation.state.isPaused,
  });

  return paused.filter(Boolean).length;
};
