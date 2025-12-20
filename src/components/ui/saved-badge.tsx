import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

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
    if (status === "saving" || status === "error") {
      setVisible(true);
      setDisplayStatus(status);
    } else if (status === "saved") {
      setVisible(true);
      setDisplayStatus("saved");
      
      const timer = setTimeout(() => {
        setVisible(false);
        onHidden?.();
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    } else if (status === "idle") {
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
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-pill",
            displayStatus === "saving" && "bg-muted text-muted-foreground",
            displayStatus === "saved" && "bg-primary/10 text-primary",
            displayStatus === "error" && "bg-destructive/10 text-destructive",
            className
          )}
        >
          {displayStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {displayStatus === "saved" && (
            <>
              <Check className="h-3 w-3" />
              <span>Saved</span>
            </>
          )}
          {displayStatus === "error" && (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>Error</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Hook for managing save status with auto-reset
 */
export function useSaveStatus(resetDelay = 2500) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");

  const setSaving = React.useCallback(() => setStatus("saving"), []);
  const setSaved = React.useCallback(() => {
    setStatus("saved");
    setTimeout(() => setStatus("idle"), resetDelay);
  }, [resetDelay]);
  const setError = React.useCallback(() => {
    setStatus("error");
    setTimeout(() => setStatus("idle"), resetDelay);
  }, [resetDelay]);
  const reset = React.useCallback(() => setStatus("idle"), []);

  return { status, setSaving, setSaved, setError, reset };
}

export default SavedBadge;
