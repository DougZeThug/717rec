import { CloudOff, RefreshCw } from 'lucide-react';
import React from 'react';

interface SyncStatusNoticeProps {
  isOnline: boolean;
  /** Rounds already tapped and filed, waiting for the signal. */
  pausedCount: number;
}

/**
 * Tells the scorer what is happening to a round saved with no signal.
 *
 * UX audit LS-03. The venue is exactly where the connection drops, and until
 * now a scorer there got nothing: no statement that they were offline, no
 * record that a round was held, and no reason to believe pressing Save had
 * done anything.
 *
 * This is **not** the "Live updates" pill in the header. That one reports the
 * realtime channel — whether another scorer's work would reach this screen —
 * and it is on a different axis: the channel can be down on a perfectly good
 * connection. Keeping them separate is why the pill's wording is untouched.
 */
export const SyncStatusNotice: React.FC<SyncStatusNoticeProps> = ({ isOnline, pausedCount }) => {
  if (isOnline && pausedCount === 0) return null;

  const rounds = pausedCount === 1 ? '1 round' : `${pausedCount} rounds`;

  if (isOnline) {
    return (
      <p
        role="status"
        data-testid="round-sync-status"
        className="flex items-center justify-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
      >
        <RefreshCw className="size-4 shrink-0 animate-spin" aria-hidden />
        Sending {rounds}…
      </p>
    );
  }

  return (
    <p
      role="status"
      data-testid="round-sync-status"
      className="flex items-center justify-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
    >
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {pausedCount === 0
        ? 'Offline — keep scoring. Rounds send themselves when the signal is back.'
        : `Offline — ${rounds} waiting to sync.`}
    </p>
  );
};
