import { Loader2 } from 'lucide-react';
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

interface DeleteMatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

const DeleteMatchDialog: React.FC<DeleteMatchDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  // Passing onClose straight to onOpenChange let Escape and the overlay dismiss
  // the dialog mid-delete, which the disabled Cancel button already blocks.
  const handleOpenChange = (next: boolean) => {
    if (!next && !isDeleting) onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the match from the schedule.
            The standings, team records and statistics it counted towards are reversed with it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // AlertDialogAction closes the dialog by default. Block that so the
              // "Deleting..." state is visible and a failure leaves the dialog
              // open to retry, matching ConfirmDialog and SeasonActivationDialog.
              e.preventDefault();
              onConfirm();
            }}
            className="bg-destructive hover:bg-destructive/90"
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMatchDialog;
