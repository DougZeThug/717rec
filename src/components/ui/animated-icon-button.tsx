import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AnimatedIconButtonProps extends Omit<ButtonProps, 'children'> {
  icon: LucideIcon;
  iconClassName?: string;
  showSuccessFlash?: boolean;
  onSuccessComplete?: () => void;
}

/**
 * An animated icon button with whileTap scale effect and optional success flash.
 * Provides consistent visual feedback across all admin icon buttons.
 */
export const AnimatedIconButton = React.forwardRef<HTMLButtonElement, AnimatedIconButtonProps>(
  ({ icon: Icon, iconClassName, showSuccessFlash = false, onClick, className, ...props }, ref) => {
    const [showSuccess, setShowSuccess] = useState(false);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick) {
        await onClick(e);
        if (showSuccessFlash) {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 500);
        }
      }
    };

    return (
      <motion.div whileTap={{ scale: 0.9 }} transition={{ duration: 0.1 }}>
        <Button
          ref={ref}
          onClick={handleClick}
          className={cn(
            'transition-all duration-150',
            showSuccess && 'ring-2 ring-green-500/50 ring-offset-1',
            className
          )}
          {...props}
        >
          <Icon className={cn('h-4 w-4', iconClassName)} />
        </Button>
      </motion.div>
    );
  }
);

AnimatedIconButton.displayName = 'AnimatedIconButton';

export default AnimatedIconButton;
