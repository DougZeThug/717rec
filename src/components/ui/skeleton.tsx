import { cn } from '@/lib/utils';

import { skeletonBaseClass, type SkeletonVariant, skeletonVariantClasses } from './skeleton-base';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Radius variant matching design tokens */
  variant?: SkeletonVariant;
}

function Skeleton({ className, variant = 'input', ...props }: SkeletonProps) {
  return (
    <div className={cn(skeletonBaseClass, skeletonVariantClasses[variant], className)} {...props} />
  );
}

export { Skeleton };
