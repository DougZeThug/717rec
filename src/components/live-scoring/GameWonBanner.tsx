import { Trophy } from 'lucide-react';
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

interface GameWonBannerProps {
  gameNumber: number;
  winnerName: string;
  totals: { team1: number; team2: number };
  canScore: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
}

/**
 * Shown once the folded totals cross the winning threshold. Completion is an
 * explicit confirmation so a mis-entered round can still be undone first.
 */
export const GameWonBanner: React.FC<GameWonBannerProps> = ({
  gameNumber,
  winnerName,
  totals,
  canScore,
  isConfirming,
  onConfirm,
}) => (
  <div className="rounded-lg border border-primary/50 bg-primary/10 p-4 text-center">
    <div className="mb-1 flex items-center justify-center gap-2 font-semibold">
      <Trophy className="size-4 text-primary" aria-hidden />
      {winnerName} wins Game {gameNumber}, {Math.max(totals.team1, totals.team2)}–
      {Math.min(totals.team1, totals.team2)}
    </div>
    <p className="mb-3 text-xs text-muted-foreground">
      Wrong score? Undo the last round instead of ending the game.
    </p>
    {canScore && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" className="min-h-[48px] w-full" disabled={isConfirming}>
            {isConfirming ? 'Ending game…' : `End Game ${gameNumber}`}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              End Game {gameNumber} — {winnerName} wins?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Final score {totals.team1}–{totals.team2}. The next game (or the match result) comes
              after this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep scoring</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>End game</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
  </div>
);
