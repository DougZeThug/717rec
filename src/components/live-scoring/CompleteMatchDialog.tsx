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
  /** Null when the game records no winner — shown as a dash, never as a team. */
  winnerName: string | null;
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

interface CompleteMatchDescriptionProps {
  team1Name: string;
  team2Name: string;
  gameLines: GameLine[];
}

// Game-by-game scores plus the warning that this writes the official result
const CompleteMatchDescription: React.FC<CompleteMatchDescriptionProps> = ({
  team1Name,
  team2Name,
  gameLines,
}) => (
  <AlertDialogDescription asChild>
    <div>
      <ul className="mb-2 space-y-1 text-sm">
        {gameLines.map((line) => (
          <li key={line.gameNumber} className="flex justify-between">
            <span>
              Game {line.gameNumber}: {team1Name} {line.team1Total}–{line.team2Total} {team2Name}
            </span>
            <span className="font-medium">{line.winnerName ?? '—'}</span>
          </li>
        ))}
      </ul>
      This records the official match result and updates the standings. An admin can reopen the
      match later if a correction is needed.
    </div>
  </AlertDialogDescription>
);

interface CompleteMatchDialogContentProps extends CompleteMatchDescriptionProps {
  winnerName: string;
  gameWins: { team1: number; team2: number };
  onConfirm: () => void;
}

// Confirmation popup: who won, the game scores and the save / cancel buttons
const CompleteMatchDialogContent: React.FC<CompleteMatchDialogContentProps> = ({
  team1Name,
  team2Name,
  winnerName,
  gameWins,
  gameLines,
  onConfirm,
}) => (
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {winnerName} wins {gameWins.team1}–{gameWins.team2}
      </AlertDialogTitle>
      <CompleteMatchDescription team1Name={team1Name} team2Name={team2Name} gameLines={gameLines} />
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Not yet</AlertDialogCancel>
      <AlertDialogAction onClick={onConfirm}>Save result</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
);

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
      <CompleteMatchDialogContent
        team1Name={team1Name}
        team2Name={team2Name}
        winnerName={winnerName}
        gameWins={gameWins}
        gameLines={gameLines}
        onConfirm={onConfirm}
      />
    </AlertDialog>
    {finalizeError != null ? (
      <Alert variant="destructive">
        <AlertTitle>Could not save result</AlertTitle>
        <AlertDescription>{getUIErrorMessage(finalizeError)}</AlertDescription>
      </Alert>
    ) : null}
  </div>
);
