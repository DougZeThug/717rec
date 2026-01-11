import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, LucideIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ActionState = 'idle' | 'loading' | 'success' | 'error';

interface ActionButtonProps extends Omit<ButtonProps, 'children'> {
  children: React.ReactNode;
  icon?: LucideIcon;
  loadingText?: string;
  successText?: string;
  successDuration?: number;
  onAction?: () => Promise<void> | void;
  state?: ActionState;
  onStateChange?: (state: ActionState) => void;
}

/**
 * ActionButton - A button with loading → success → reset confirmation pattern.
 * Provides visual feedback for async actions with smooth icon transitions.
 *
 * Usage:
 * <ActionButton onAction={async () => await submitForm()}>
 *   Submit Score
 * </ActionButton>
 */
export const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      children,
      icon: Icon,
      loadingText,
      successText,
      successDuration = 1500,
      onAction,
      onClick,
      state: controlledState,
      onStateChange,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalState, setInternalState] = useState<ActionState>('idle');
    const state = controlledState ?? internalState;
    const setState = onStateChange ?? setInternalState;

    // Auto-reset after success
    useEffect(() => {
      if (state === 'success') {
        const timer = setTimeout(() => {
          setState('idle');
        }, successDuration);
        return () => clearTimeout(timer);
      }
    }, [state, successDuration, setState]);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (state === 'loading') return;

      onClick?.(e);

      if (onAction) {
        setState('loading');
        try {
          await onAction();
          setState('success');
        } catch (error) {
          setState('error');
          // Reset to idle after showing error briefly
          setTimeout(() => setState('idle'), 1500);
        }
      }
    };

    const isLoading = state === 'loading';
    const isSuccess = state === 'success';

    // Icon animation variants
    const iconVariants = {
      initial: { opacity: 0, scale: 0.5, rotate: -90 },
      animate: { opacity: 1, scale: 1, rotate: 0 },
      exit: { opacity: 0, scale: 0.5, rotate: 90 },
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={cn(
          'relative overflow-hidden',
          isSuccess && 'ring-2 ring-green-500/30 ring-offset-1 bg-green-500/10',
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.span
                key="loader"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15 }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
              </motion.span>
            ) : isSuccess ? (
              <motion.span
                key="check"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15, type: 'spring', stiffness: 500 }}
              >
                <Check className="h-4 w-4 text-green-500" />
              </motion.span>
            ) : Icon ? (
              <motion.span
                key="icon"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.15 }}
              >
                <Icon className="h-4 w-4" />
              </motion.span>
            ) : null}
          </AnimatePresence>

          <span>
            {isLoading
              ? (loadingText ?? children)
              : isSuccess
                ? (successText ?? children)
                : children}
          </span>
        </span>
      </Button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

export default ActionButton;
