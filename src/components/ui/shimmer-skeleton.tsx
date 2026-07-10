import React from 'react';

import { cn } from '@/lib/utils';

import { skeletonBaseClass, type SkeletonVariant, skeletonVariantClasses } from './skeleton-base';

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Make the skeleton circular */
  circle?: boolean;
  /** Number of skeleton items to render */
  count?: number;
  /** Radius variant matching design tokens */
  variant?: SkeletonVariant;
}

const sizes = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-16',
};

/**
 * Enhanced skeleton component with shimmer animation
 * Uses design system radius tokens for consistency
 */
const ShimmerSkeleton = React.forwardRef<HTMLDivElement, ShimmerSkeletonProps>(
  ({ className, width, height, circle, count = 1, variant = 'input', style, ...props }, ref) => {
    const skeletonStyle: React.CSSProperties = {
      width: width,
      height: height,
      ...style,
    };

    const radiusClass = circle ? 'rounded-full' : skeletonVariantClasses[variant];

    // Stable ids per count avoid using array index as React key.
    const skeletonIds = React.useMemo(
      () => Array.from({ length: count }, () => crypto.randomUUID()),
      [count]
    );
    const skeletons = skeletonIds.map((id, i) => (
      <div
        key={id}
        ref={i === 0 ? ref : undefined}
        className={cn(skeletonBaseClass, radiusClass, className)}
        style={skeletonStyle}
        {...props}
      />
    ));

    return count === 1 ? skeletons[0] : skeletons;
  }
);

ShimmerSkeleton.displayName = 'ShimmerSkeleton';

/**
 * Skeleton for avatar/profile images
 */
const AvatarSkeleton: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  return <ShimmerSkeleton circle className={cn(sizes[size], className)} />;
};

export { AvatarSkeleton, ShimmerSkeleton };
