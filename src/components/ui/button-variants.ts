import { cva } from 'class-variance-authority';

import { gradients } from '@/styles/design-system';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-input text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation',
  {
    variants: {
      variant: {
        default: gradients.button.primary,
        destructive:
          'bg-gradient-to-br from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: gradients.button.secondary,
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        cornhole: gradients.button.primary,
        blue: gradients.button.blue,
        green: gradients.button.green,
        // New button variants with orange accents
        orange: gradients.button.orange,
        orangeSubtle: gradients.button.orangeSubtle,
        blueOrange: gradients.button.blueOrange,
      },
      size: {
        default: 'h-10 min-h-[44px] px-4 py-2',
        xs: 'h-8 min-h-[44px] px-2 text-xs',
        sm: 'h-9 min-h-[44px] px-3',
        lg: 'h-11 min-h-11 px-8',
        icon: 'size-10 min-h-[44px] min-w-[44px]',
        'icon-sm': 'size-8 min-h-[44px] min-w-[44px]', // Small icon but large touch target
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);