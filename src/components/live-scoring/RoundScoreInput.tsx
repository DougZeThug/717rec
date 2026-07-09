import React, { useState } from 'react';

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
  onSubmit: (submission: RoundSubmission) => void;
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
  isSubmitting,
  disabled = false,
}) => {
  const [team1, setTeam1] = useState<SideSelection>(EMPTY);
  const [team2, setTeam2] = useState<SideSelection>(EMPTY);

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

  const handleSubmit = () => {
    if (!ready || team1.score === null || team2.score === null) return;
    onSubmit({
      team1Score: team1.score,
      team2Score: team2.score,
      team1Bags: getBagBreakdown(team1.score, team1.bagsIn),
      team2Bags: getBagBreakdown(team2.score, team2.bagsIn),
    });
    setTeam1(EMPTY);
    setTeam2(EMPTY);
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
