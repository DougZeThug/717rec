import { cva } from 'class-variance-authority';

export const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground',
        secondary:
          'border-transparent bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground',
        destructive:
          'border-transparent bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground',
        outline: 'text-foreground border border-gray-200 dark:border-gray-700',
        // Tier badges use the muted division tokens so large lists of team
        // cards stay inside the app theme instead of shouting.
        recreational:
          'border border-[hsl(var(--recreational-soft)/0.3)] bg-[hsl(var(--recreational-soft)/0.15)] text-[hsl(var(--recreational-soft))] hover:bg-[hsl(var(--recreational-soft)/0.25)]',
        intermediate:
          'border border-[hsl(var(--intermediate-soft)/0.3)] bg-[hsl(var(--intermediate-soft)/0.15)] text-[hsl(var(--intermediate-soft))] hover:bg-[hsl(var(--intermediate-soft)/0.25)]',
        competitive:
          'border border-[hsl(var(--competitive-soft)/0.3)] bg-[hsl(var(--competitive-soft)/0.15)] text-[hsl(var(--competitive-soft))] hover:bg-[hsl(var(--competitive-soft)/0.25)]',
        blueorange:
          'border-transparent bg-gradient-to-br from-blue-500 to-amber-500 text-white hover:from-blue-400 hover:to-amber-400',
        // Winter theme variants - frosted pills
        winter: 'badge-winter',
        winterAccent: 'badge-winter-accent',
        winterRank: 'badge-rank',
        // Double header variant - amber/orange gradient
        doubleHeader:
          'border-transparent bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);
