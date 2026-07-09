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
          This removes round {roundNumber} from game {gameNumber}. Game totals will recompute
          automatically. If deleting this round changes the game winner, use "Change winner" above
          to fix it.
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
