import { AnimatePresence, m } from 'framer-motion';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

import type { SaveStatus } from './use-save-status';

interface SavedBadgeProps {
  status: SaveStatus;
  className?: string;
  /** Auto-hide after saved (default: 2000ms) */
  autoHideDelay?: number;
  /** Callback when badge finishes hiding */
  onHidden?: () => void;
}

/**
 * Tiny badge for optimistic UI feedback
 * Shows: nothing (idle) → "Saving..." → "Saved ✓" → fades out
 */
export const SavedBadge: React.FC<SavedBadgeProps> = ({
  status,
  className,
  autoHideDelay = 2000,
  onHidden,
}) => {
  const [visible, setVisible] = React.useState(false);
  const [displayStatus, setDisplayStatus] = React.useState<SaveStatus>(status);

  React.useEffect(() => {
    if (status === 'saving' || status === 'error') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-clear timer for saved indicator
      setVisible(true);
      setDisplayStatus(status);
    } else if (status === 'saved') {
      setVisible(true);
      setDisplayStatus('saved');

      const timer = setTimeout(() => {
        setVisible(false);
        onHidden?.();
      }, autoHideDelay);

      return () => clearTimeout(timer);
    } else if (status === 'idle') {
      // Keep showing current state briefly before hiding
      const timer = setTimeout(() => {
        setVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [status, autoHideDelay, onHidden]);

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <m.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-pill',
            displayStatus === 'saving' && 'bg-muted text-muted-foreground',
            displayStatus === 'saved' && 'bg-primary/10 text-primary',
            displayStatus === 'error' && 'bg-destructive/10 text-destructive',
            className
          )}
        >
          {displayStatus === 'saving' && (
            <>
              <Loader2 className="size-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {displayStatus === 'saved' && (
            <>
              <Check className="size-3" />
              <span>Saved</span>
            </>
          )}
          {displayStatus === 'error' && (
            <>
              <AlertCircle className="size-3" />
              <span>Error</span>
            </>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default SavedBadge;
