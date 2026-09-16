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

/**
 * How many round saves have not settled yet — parked ones and ones on their way.
 *
 * The count above answers "what is waiting for a signal", which is what the
 * sync notice needs. Deciding whether a won game is safe to end needs the wider
 * question, because a round that is *sending* can still be refused and take the
 * winning score back with it.
 *
 * `submitRound.isPending` does not answer it. That reports the most recent save
 * only, so a round parked offline and now resuming — while a later save has
 * already settled — shows as neither pending nor paused, and the End Game
 * button was enabled in that gap. The round log already reads the whole
 * mutation cache for the same reason (see useRoundMutations' onSettled).
 */
export const useUnsettledRoundCount = (matchId: string): number =>
  useMutationState({
    filters: { mutationKey: liveScoringKeys.submitRound(matchId), status: 'pending' },
    // A constant, so the array is stable between renders and an unrelated cache
    // change does not re-render the panel.
    select: () => true,
  }).length;
