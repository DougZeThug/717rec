import { RotateCcw } from 'lucide-react';
import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ReopenGameButtonProps {
  gameNumber: number;
  isPending: boolean;
  onReopen: () => void;
}

/**
 * Reopening an ended game is available to any scorer on either team, so the
 * opposing team's scorer can reopen a game the other side has just won. It used
 * to act on the first press, while undoing a single round — a far smaller
 * change — asked first. This puts the more surprising action behind at least as
 * much friction as the less surprising one.
 *
 * The prompt appears in two render paths (between games, and after the match is
 * decided but not yet finalised), which is why it lives in its own component.
 *
 * Whoever presses it is told what happened by the same realtime notice the other
 * scorer gets — see useLiveMatchRealtime. There is deliberately no success toast
 * on the mutation, or the person acting would get two.
 */
export const ReopenGameButton: React.FC<ReopenGameButtonProps> = ({
  gameNumber,
  isPending,
  onReopen,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full gap-1.5 text-muted-foreground"
        disabled={isPending}
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Reopen Game {gameNumber} to fix a score
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Reopen Game {gameNumber}?</AlertDialogTitle>
        <AlertDialogDescription>
          {`This puts Game ${gameNumber} back in progress so a score can be corrected. Its rounds are kept. The other team's scorer is told, and their screen changes too.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep game closed</AlertDialogCancel>
        <AlertDialogAction onClick={onReopen}>Reopen game</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
