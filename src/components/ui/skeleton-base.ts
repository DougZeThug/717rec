import { cn } from '@/lib/utils';

/**
 * Shared skeleton design tokens and shimmer animation.
 *
 * Both `Skeleton` and `ShimmerSkeleton` build on these so every loading
 * placeholder in the app animates identically. Prefer those primitives over
 * hand-rolled `animate-pulse` / `bg-muted` divs.
 */

export type SkeletonVariant = 'card' | 'input' | 'pill';

export const skeletonVariantClasses: Record<SkeletonVariant, string> = {
  card: 'rounded-card',
  input: 'rounded-input',
  pill: 'rounded-pill',
};

/** Shimmer base class (positioning, background, animation) — no radius. */
export const skeletonBaseClass = cn(
  'relative overflow-hidden bg-muted',
  'before:absolute before:inset-0',
  'before:-translate-x-full',
  'before:animate-[shimmer_2s_infinite]',
  'before:bg-gradient-to-r',
  'before:from-transparent before:via-foreground/5 before:to-transparent'
);
