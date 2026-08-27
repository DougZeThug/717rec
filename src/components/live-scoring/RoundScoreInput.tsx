import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { getBagBreakdown, isAmbiguousScore } from '@/utils/liveScoring/bagBreakdown';
import { cancellationNet } from '@/utils/liveScoring/scoring';
import type { BagBreakdown } from '@/utils/liveScoring/types';

import { ScoreGrid } from './ScoreGrid';

export interface RoundSubmission {
  team1Score: number;
  team2Score: number;
  team1Bags: BagBreakdown | null;
  team2Bags: BagBreakdown | null;
}

interface RoundScoreInputProps {
  roundNumber: number;
  team1Name: string;
  team2Name: string;
  /**
   * Saves the round. Resolve to clear the grids; reject to keep the tapped
   * scores on screen so the scorer can retry without re-entering them. It must
   * return a promise: a synchronous callback cannot report a failed save, and
   * would silently go back to clearing the grids on every press.
   */
  onSubmit: (submission: RoundSubmission) => Promise<unknown>;
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

interface SideSelection {
  score: number | null;
  bagsIn: number | undefined;
}

const EMPTY: SideSelection = { score: null, bagsIn: undefined };

const isResolved = (side: SideSelection) =>
  side.score !== null && (!isAmbiguousScore(side.score) || side.bagsIn !== undefined);

export const RoundScoreInput: React.FC<RoundScoreInputProps> = ({
  roundNumber,
  team1Name,
  team2Name,
  onSubmit,
  roundKey,
  onSelectionDiscarded,
  isSubmitting,
  disabled = false,
}) => {
  const [team1, setTeam1] = useState<SideSelection>(EMPTY);
  const [team2, setTeam2] = useState<SideSelection>(EMPTY);

  // A failed save keeps the tapped scores for a retry, but they belong to one
  // round. If that round is recorded elsewhere the heading moves on, and saving
  // them now would file them under the wrong round number.
  const settledKey = useRef(roundKey);
  useEffect(() => {
    // The optimistic round bumps the round number the moment Save is pressed.
    // Ignore that; wait until the save settles and the number is real again.
    if (isSubmitting) return;
    if (settledKey.current === roundKey) return;
    settledKey.current = roundKey;
    // Our own successful save has already emptied the grids, so there is
    // nothing to discard and nothing to announce.
    const hadSelection = team1.score !== null || team2.score !== null;
    setTeam1(EMPTY);
    setTeam2(EMPTY);
    if (hadSelection) onSelectionDiscarded?.();
  }, [roundKey, isSubmitting, team1.score, team2.score, onSelectionDiscarded]);

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
    try {
      await onSubmit({
        team1Score: team1.score,
        team2Score: team2.score,
        team1Bags: getBagBreakdown(team1.score, team1.bagsIn),
        team2Bags: getBagBreakdown(team2.score, team2.bagsIn),
      });
      setTeam1(EMPTY);
      setTeam2(EMPTY);
    } catch {
      // Keep the tapped scores so the scorer can press Save Round again
      // instead of re-entering the round from memory. The failure toast is
      // already raised by useRoundMutations.
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
          onSelectScore={(score) => setTeam1({ score, bagsIn: undefined })}
          onSelectBagsIn={(bagsIn) => setTeam1((prev) => ({ ...prev, bagsIn }))}
          disabled={disabled || isSubmitting}
        />
        <ScoreGrid
          teamName={team2Name}
          accent="red"
          selectedScore={team2.score}
          selectedBagsIn={team2.bagsIn}
          onSelectScore={(score) => setTeam2({ score, bagsIn: undefined })}
          onSelectBagsIn={(bagsIn) => setTeam2((prev) => ({ ...prev, bagsIn }))}
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
