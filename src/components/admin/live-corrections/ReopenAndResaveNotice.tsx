import { AlertTriangle, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFinalizeMatch } from '@/hooks/live-scoring/useFinalizeMatch';

export interface ReopenAndResaveNoticeProps {
  matchId: string;
}

/**
 * B-19: on a finalized match the rounds and the recorded result disagree until
 * someone saves the result again, and finalize_live_match refuses to run while a
 * result is still there — so reopening first is mandatory. This does both halves
 * in one press rather than sending the admin to the live view for an ordered
 * two-step job.
 *
 * It asks first: reopening reverses the recorded result and both teams' records.
 */
export const ReopenAndResaveNotice: React.FC<ReopenAndResaveNoticeProps> = ({ matchId }) => {
  const { reopenAndRefinalize } = useFinalizeMatch(matchId);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2 items-start rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <AlertTriangle className="size-4 mt-0.5 text-amber-600 shrink-0" aria-hidden />
        <div className="space-y-2">
          <div>
            This match is <strong>finalized</strong>. Edits here change the rounds and games
            immediately, but the official result and the standings stay as they are until the result
            is saved again. Until then the match disagrees with itself, and the admin dashboard
            lists it.
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={reopenAndRefinalize.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <RotateCcw className="size-4" aria-hidden />
            {reopenAndRefinalize.isPending ? 'Re-saving…' : 'Reopen & re-save result'}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reopen and re-save this result?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the recorded result and both teams&apos; records, then works the result
              out again from the games above and saves it. Standings move twice and end up matching
              the games. Do this once the rounds are right. If the games no longer decide a winner,
              the old result is still reversed and the match is left open for you to fix.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reopenAndRefinalize.isPending}>
              Leave it alone
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={reopenAndRefinalize.isPending}
              onClick={() => {
                setConfirmOpen(false);
                reopenAndRefinalize.mutate();
              }}
            >
              Reopen &amp; re-save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
