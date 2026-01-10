import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

interface InlineRefreshIndicatorProps {
  isRefetching: boolean;
  className?: string;
  label?: string;
}

/**
 * Subtle inline indicator for background refetch states
 * Shows "Updating..." with spinning icon, keeps UI stable
 */
export const InlineRefreshIndicator: React.FC<InlineRefreshIndicatorProps> = ({
  isRefetching,
  className,
  label = 'Updating...',
}) => {
  return (
    <AnimatePresence>
      {isRefetching && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.15 }}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
            className
          )}
        >
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Header variant with slightly larger styling
 */
export const HeaderRefreshIndicator: React.FC<InlineRefreshIndicatorProps> = ({
  isRefetching,
  className,
  label = 'Updating...',
}) => {
  return (
    <AnimatePresence>
      {isRefetching && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium',
            'bg-muted/50 text-muted-foreground rounded-pill border border-border',
            className
          )}
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InlineRefreshIndicator;
