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
} from '@/components/ui/alert-dialog';

export interface DeleteRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundNumber: number;
  gameNumber: number;
  onConfirm: () => void;
  isDeleting: boolean;
}

export const DeleteRoundDialog: React.FC<DeleteRoundDialogProps> = ({
  open,
  onOpenChange,
  roundNumber,
  gameNumber,
  onConfirm,
  isDeleting,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete round {roundNumber}?</AlertDialogTitle>
        <AlertDialogDescription>
          This removes round {roundNumber} from game {gameNumber}. The game totals shown here
          recompute at once, but the game&apos;s stored winner does not: if deleting this round
          changes who won, use &quot;Change winner&quot; above to fix it. On a finalized match,
          finish with &quot;Reopen &amp; re-save result&quot; so the official result follows.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeleting}>Keep round</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete round'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
