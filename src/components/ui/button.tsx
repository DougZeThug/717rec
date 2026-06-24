import { Slot } from '@radix-ui/react-slot';
import { type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button-variants';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          // Pressed state for solid buttons only (not ghost/outline in navbar)
          variant !== 'ghost' &&
            variant !== 'outline' &&
            'active:scale-[0.97] hover:shadow-md active:shadow-sm',
          // Subtle hover scale for primary button variants only
          (variant === 'default' ||
            variant === 'cornhole' ||
            variant === 'blue' ||
            variant === 'orange') &&
            'hover:scale-[1.02]'
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
