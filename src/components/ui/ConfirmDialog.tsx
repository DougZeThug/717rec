import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

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

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What the action will do. Say what cannot be undone, and to what. */
  description: ReactNode;
  onConfirm: () => void;
  /** Keeps the dialog open and both buttons disabled while the action runs. */
  isPending?: boolean;
  confirmLabel?: string;
  pendingLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
}

/**
 * Confirmation prompt for an action that destroys or overwrites data.
 *
 * Follows the pattern in src/docs/MODAL_PATTERNS.md. Existing hand-rolled
 * AlertDialogs with bespoke bodies are left as they are; this is for the plain
 * "are you sure" case, and for the two that need the same prompt from more
 * than one render path.
 */
export const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isPending = false,
  confirmLabel = 'Delete',
  pendingLabel = 'Deleting...',
  cancelLabel = 'Cancel',
  variant = 'destructive',
}: ConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={(next) => !next && !isPending && onOpenChange(false)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            // Keep the dialog mounted while the action runs, so the pending
            // state is visible and a second click cannot get through.
            e.preventDefault();
            onConfirm();
          }}
          disabled={isPending}
          className={
            variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : undefined
          }
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {pendingLabel}
            </>
          ) : (
            confirmLabel
          )}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
