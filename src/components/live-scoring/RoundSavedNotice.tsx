import { CheckCircle2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface SavedRound {
  round: number;
  /** When it was saved. A new value re-shows the notice for the same round. */
  at: number;
}

interface RoundSavedNoticeProps {
  saved: SavedRound | null;
  /** How long the confirmation stays on screen. */
  showForMs?: number;
}

/**
 * Confirms one round reached the league.
 *
 * Saving is an ordinary request, so it succeeds whether or not the realtime
 * channel is up. Until now the only signs a round had landed were the grids
 * emptying and the heading counting on, which a scorer reading "Connecting…"
 * could easily take for a screen that had lost their work.
 */
export const RoundSavedNotice: React.FC<RoundSavedNoticeProps> = ({ saved, showForMs = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a saved round is an event, and the notice hides itself again
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), showForMs);
    return () => window.clearTimeout(timer);
  }, [saved, showForMs]);

  if (!saved || !visible) return null;

  return (
    <p
      role="status"
      className="flex items-center justify-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-950/30 dark:text-green-400"
    >
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
      Round {saved.round} saved
    </p>
  );
};
