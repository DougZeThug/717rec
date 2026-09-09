import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getBagBreakdown, isAmbiguousScore } from '@/utils/liveScoring/bagBreakdown';
import {
  clearRoundDraft,
  loadRoundDraft,
  saveRoundDraft,
} from '@/utils/liveScoring/roundDraftStorage';
import { cancellationNet } from '@/utils/liveScoring/scoring';
import type { BagBreakdown, SideSelection } from '@/utils/liveScoring/types';

import { ScoreGrid } from './ScoreGrid';

export interface RoundSubmission {
  team1Score: number;
  team2Score: number;
  team1Bags: BagBreakdown | null;
  team2Bags: BagBreakdown | null;
}

/**
 * What became of a round the scorer filed. `queued` means it is held for a
 * connection that is not there yet — the grids clear either way, but a queued
 * round keeps its saved copy so a reload can hand the taps back.
 */
export type RoundSaveOutcome = 'saved' | 'queued';

interface RoundScoreInputProps {
  roundNumber: number;
  team1Name: string;
  team2Name: string;
  /** Keys the copy kept for a reload, so it comes back to the right game. */
  gameId: string;
  /**
   * Saves the round. Resolve to clear the grids; reject to keep the tapped
   * scores on screen so the scorer can retry without re-entering them. It must
   * return a promise: a synchronous callback cannot report a failed save, and
   * would silently go back to clearing the grids on every press.
   *
   * Resolving with `'queued'` says the round is held for a missing connection.
   * The grids still clear, because the round is filed as far as the scorer is
   * concerned and the next one has to be enterable — but the copy kept for a
   * reload stays, because nothing has reached the league yet.
   */
  onSubmit: (submission: RoundSubmission) => Promise<RoundSaveOutcome | void>;
  /**
   * Identifies the round the selections belong to. When it changes, the round
   * moved on and any kept selections are stale, so they are dropped.
   */
  roundKey: string;
  /** Called only when a round change actually threw away tapped scores. */
  onSelectionDiscarded?: () => void;
  isSubmitting: boolean;
  disabled?: boolean;
}

const EMPTY: SideSelection = { score: null, bagsIn: undefined };

const isResolved = (side: SideSelection) =>
  side.score !== null && (!isAmbiguousScore(side.score) || side.bagsIn !== undefined);

export const RoundScoreInput: React.FC<RoundScoreInputProps> = ({
  roundNumber,
  team1Name,
  team2Name,
  gameId,
  onSubmit,
  roundKey,
  onSelectionDiscarded,
  isSubmitting,
  disabled = false,
}) => {
  // Seeded from the copy kept on the phone, so a reload — or the browser
  // reclaiming the tab while the screen was locked — hands the taps back
  // instead of asking the scorer to remember the round (UX audit LS-03). A
  // draft for an earlier round is not offered: somebody recorded that round
  // while they were away.
  const [restored] = useState(() => loadRoundDraft(gameId, roundNumber));
  const [team1, setTeam1] = useState<SideSelection>(() => restored?.team1 ?? EMPTY);
  const [team2, setTeam2] = useState<SideSelection>(() => restored?.team2 ?? EMPTY);

  /** Keeps the copy in step with the grids. Cleared only once a round lands. */
  const remember = (next1: SideSelection, next2: SideSelection) => {
    if (next1.score === null && next2.score === null) clearRoundDraft(gameId);
    else saveRoundDraft({ gameId, roundNumber, team1: next1, team2: next2 });
  };

  // The store is written beside the setter rather than inside its updater: an
  // updater can be called twice and must stay free of side effects. Each tap is
  // one event, so reading this render's value is enough.
  const chooseTeam1 = (update: (prev: SideSelection) => SideSelection) => {
    const next = update(team1);
    setTeam1(next);
    remember(next, team2);
  };

  const chooseTeam2 = (update: (prev: SideSelection) => SideSelection) => {
    const next = update(team2);
    setTeam2(next);
    remember(team1, next);
  };

  // A failed save keeps the tapped scores for a retry, but they belong to one
  // round. If that round is recorded elsewhere the heading moves on, and saving
  // them now would file them under the wrong round number.
  const settledKey = useRef(roundKey);
  // Set while this scorer's own save is on its way, and cleared by the effect
  // below as soon as the round number settles again. The round moving because
  // *they* saved is not the round being taken away from them, so it must not be
  // announced — the taps on screen are the ones they just filed.
  const selfSaved = useRef(false);
  useEffect(() => {
    // The optimistic round bumps the round number the moment Save is pressed.
    // Ignore that; wait until the save settles and the number is real again.
    if (isSubmitting) return;
    if (settledKey.current === roundKey) return;
    settledKey.current = roundKey;
    const ownSave = selfSaved.current;
    selfSaved.current = false;
    // Our own successful save has already emptied the grids, so there is
    // nothing to discard and nothing to announce. `isSubmitting` alone does not
    // prove that: the mutation can report itself finished a render before the
    // grids clear, and the taps are still on screen in that gap.
    const hadSelection = team1.score !== null || team2.score !== null;
    setTeam1(EMPTY);
    setTeam2(EMPTY);
    // The round moved on, so the kept copy belongs to nobody now.
    clearRoundDraft(gameId);
    if (hadSelection && !ownSave) onSelectionDiscarded?.();
  }, [roundKey, isSubmitting, team1.score, team2.score, onSelectionDiscarded, gameId]);

  const ready = isResolved(team1) && isResolved(team2);
  const net =
    team1.score !== null && team2.score !== null
      ? cancellationNet({ team1: team1.score, team2: team2.score })
      : null;

  const netPreview =
    net === null
      ? null
      : net.winner === null
        ? 'Wash — no points'
        : `${net.winner === 1 ? team1Name : team2Name} +${net.net}`;

  const handleSubmit = async () => {
    if (!ready || team1.score === null || team2.score === null) return;
    selfSaved.current = true;
    try {
      const outcome = await onSubmit({
        team1Score: team1.score,
        team2Score: team2.score,
        team1Bags: getBagBreakdown(team1.score, team1.bagsIn),
        team2Bags: getBagBreakdown(team2.score, team2.bagsIn),
      });
      setTeam1(EMPTY);
      setTeam2(EMPTY);
      // A queued round has not reached the league, so its copy stays: a reload
      // before the signal returns would otherwise lose it with nothing said.
      if (outcome !== 'queued') clearRoundDraft(gameId);
    } catch {
      // Keep the tapped scores so the scorer can press Save Round again
      // instead of re-entering the round from memory. The failure toast is
      // already raised by useRoundMutations. Nothing was filed, so a round
      // change from here on is somebody else's and must still be announced.
      selfSaved.current = false;
    }
  };

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Round {roundNumber}</span>
        {netPreview && (
          <span className="text-xs font-medium text-muted-foreground" data-testid="net-preview">
            {netPreview}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <ScoreGrid
          teamName={team1Name}
          accent="blue"
          selectedScore={team1.score}
          selectedBagsIn={team1.bagsIn}
          onSelectScore={(score) => chooseTeam1(() => ({ score, bagsIn: undefined }))}
          onSelectBagsIn={(bagsIn) => chooseTeam1((prev) => ({ ...prev, bagsIn }))}
          disabled={disabled || isSubmitting}
        />
        <ScoreGrid
          teamName={team2Name}
          accent="red"
          selectedScore={team2.score}
          selectedBagsIn={team2.bagsIn}
          onSelectScore={(score) => chooseTeam2(() => ({ score, bagsIn: undefined }))}
          onSelectBagsIn={(bagsIn) => chooseTeam2((prev) => ({ ...prev, bagsIn }))}
          disabled={disabled || isSubmitting}
        />
      </div>

      <Button
        type="button"
        className="mt-3 min-h-[48px] w-full text-base"
        onClick={handleSubmit}
        disabled={!ready || isSubmitting || disabled}
      >
        {isSubmitting ? 'Saving…' : 'Save Round'}
      </Button>
    </div>
  );
};
