import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { getUIErrorMessage } from '@/utils/errorHandler';

export interface GameLine {
  gameNumber: number;
  team1Total: number;
  team2Total: number;
  winnerName: string;
}

interface CompleteMatchDialogProps {
  team1Name: string;
  team2Name: string;
  winnerName: string;
  gameWins: { team1: number; team2: number };
  gameLines: GameLine[];
  isFinalizing: boolean;
  finalizeError?: unknown;
  onConfirm: () => void;
}

/**
 * The point of no return: writes the official result and updates standings.
 * Everything before this (rounds, games) is freely correctable.
 */
export const CompleteMatchDialog: React.FC<CompleteMatchDialogProps> = ({
  team1Name,
  team2Name,
  winnerName,
  gameWins,
  gameLines,
  isFinalizing,
  finalizeError,
  onConfirm,
}) => (
  <div className="space-y-2">
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" className="min-h-[52px] w-full text-base" disabled={isFinalizing}>
          {isFinalizing ? 'Saving result…' : 'Save official result'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {winnerName} wins {gameWins.team1}–{gameWins.team2}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <ul className="mb-2 space-y-1 text-sm">
                {gameLines.map((line) => (
                  <li key={line.gameNumber} className="flex justify-between">
                    <span>
                      Game {line.gameNumber}: {team1Name} {line.team1Total}–{line.team2Total}{' '}
                      {team2Name}
                    </span>
                    <span className="font-medium">{line.winnerName}</span>
                  </li>
                ))}
              </ul>
              This records the official match result and updates the standings. An admin can reopen
              the match later if a correction is needed.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not yet</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Save result</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    {finalizeError != null ? (
      <Alert variant="destructive">
        <AlertTitle>Could not save result</AlertTitle>
        <AlertDescription>{getUIErrorMessage(finalizeError)}</AlertDescription>
      </Alert>
    ) : null}
  </div>
);
