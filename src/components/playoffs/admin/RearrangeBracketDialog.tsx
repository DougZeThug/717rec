import { AlertTriangle, Loader2, Shuffle } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useLoserRearrangeBoard,
  usePlayoffApplyRearrange,
} from '@/hooks/playoffs/usePlayoffRearrange';
import { simulateRearrange } from '@/services/brackets/manager/services/BracketAdmin/rearrange/simulate';

import type { Arrangement } from './rearrange/dropLogic';
import { applyDrop, baselineArrangement, isDirty, toAssignments } from './rearrange/dropLogic';
import { RearrangeBoard } from './rearrange/RearrangeBoard';

/**
 * The in-progress edit: the arrangement being built, together with the
 * baseline it started from. The baseline is captured at the FIRST drag and
 * never recomputed — it is the optimistic-concurrency token the save sends,
 * so it must describe the board the admin actually edited, even if the board
 * query were to refresh underneath the open screen.
 */
interface WorkingState {
  arrangement: Arrangement;
  baseline: Arrangement;
}

interface RearrangeBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketId: string | null;
  /** @internal Test seam: start from a pre-dragged edit. */
  initialWorking?: WorkingState;
}

const RearrangeBody: React.FC<Omit<RearrangeBracketDialogProps, 'open'>> = ({
  onOpenChange,
  bracketId,
  initialWorking,
}) => {
  const { data: board, isLoading, error } = useLoserRearrangeBoard(bracketId, true);
  const mutation = usePlayoffApplyRearrange(bracketId);
  const [step, setStep] = useState<'board' | 'confirm'>('board');
  const [working, setWorking] = useState<WorkingState | null>(initialWorking ?? null);

  const baseline = useMemo(() => (board ? baselineArrangement(board) : null), [board]);
  const arrangement = working?.arrangement ?? baseline;
  // The same pure simulation the server runs at save time, re-run on every
  // drag — the preview and the eventual save can never disagree.
  const plan = useMemo(
    () =>
      board && arrangement ? simulateRearrange(board.snapshot, toAssignments(arrangement)) : null,
    [board, arrangement]
  );
  const dirty = baseline != null && arrangement != null && isDirty(baseline, arrangement);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (error || !board || !arrangement) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {error instanceof Error ? error.message : 'This bracket cannot be rearranged right now.'}
      </p>
    );
  }
  if (baseline && baseline.size === 0) {
    return (
      <p className="py-4 text-sm text-muted-foreground">
        Nothing can be moved right now — teams appear here once they drop into the losers bracket.
      </p>
    );
  }

  const handleDrop = (sourceKey: string, targetKey: string) =>
    setWorking({
      arrangement: applyDrop(arrangement, sourceKey, targetKey),
      baseline: working?.baseline ?? baseline,
    });

  const handleSave = () =>
    mutation.mutate(
      {
        assignments: toAssignments(arrangement),
        baseline: toAssignments(working?.baseline ?? baseline),
      },
      { onSuccess: () => onOpenChange(false) }
    );

  if (step === 'confirm') {
    return (
      <>
        <div className="space-y-4 py-2">
          <div>
            <h3 className="mb-1 text-sm font-semibold">Your moves</h3>
            <ul className="list-disc space-y-0.5 pl-5 text-sm">
              {plan?.moves.map((move) => (
                <li key={move}>{move}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">What happens automatically</h3>
            {plan && plan.consequences.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {plan.consequences.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No other matches are affected.</p>
            )}
          </div>
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
            <p>
              Saving applies every change above at once. Matches that have already been played are
              never touched.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setStep('board')} disabled={mutation.isPending}>
            Back
          </Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save arrangement'
            )}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="space-y-3 py-2">
        <RearrangeBoard board={board} arrangement={arrangement} plan={plan} onDrop={handleDrop} />
        {dirty && plan && !plan.ok && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription>
              <ul className="list-disc space-y-0.5 pl-4">
                {plan.problems.map((problem) => (
                  <li key={problem.message}>{problem.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        {dirty && plan?.ok && plan.consequences.length > 0 && (
          <div className="rounded-md border p-3">
            <h3 className="mb-1 text-sm font-semibold">What happens automatically</h3>
            <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
              {plan.consequences.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={() => setWorking(null)} disabled={!dirty}>
          Reset
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={() => setStep('confirm')} disabled={!dirty || !plan?.ok}>
          Review changes…
        </Button>
      </DialogFooter>
    </>
  );
};

/**
 * Admin dialog: rearrange the losers bracket freely after the bracket has
 * started. Shows every losers-bracket round side by side; drag a team onto a
 * BYE spot to move it there, or onto another team to swap them. Spots filled
 * automatically (walkover winners, carried BYEs) update live, problems are
 * flagged as you go, and one save applies the whole arrangement together.
 */
const RearrangeBracketDialog: React.FC<RearrangeBracketDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  initialWorking,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[85vh] flex-col overflow-y-auto sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shuffle className="size-5" />
          Rearrange Teams
        </DialogTitle>
        <DialogDescription>
          Drag a team onto an open BYE spot to move it there, or onto another team to swap the two.
          Nothing is saved until you review and confirm.
        </DialogDescription>
      </DialogHeader>
      {/* State lives in the body, keyed by bracket: the closed dialog unmounts
          it entirely, so drags reset on reopen without state-syncing effects. */}
      <RearrangeBody
        key={bracketId ?? 'none'}
        bracketId={bracketId}
        onOpenChange={onOpenChange}
        initialWorking={initialWorking}
      />
    </DialogContent>
  </Dialog>
);

export default RearrangeBracketDialog;
