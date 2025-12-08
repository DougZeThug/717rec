import React from "react";
import { cn } from "@/lib/utils";

interface ShimmerSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton */
  width?: string | number;
  /** Height of the skeleton */
  height?: string | number;
  /** Make the skeleton circular */
  circle?: boolean;
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Enhanced skeleton component with shimmer animation
 * Provides consistent loading states across the app
 */
const ShimmerSkeleton = React.forwardRef<HTMLDivElement, ShimmerSkeletonProps>(
  ({ className, width, height, circle, count = 1, style, ...props }, ref) => {
    const skeletonStyle: React.CSSProperties = {
      width: width,
      height: height,
      ...style,
    };

    const skeletons = Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        className={cn(
          "relative overflow-hidden bg-muted",
          circle ? "rounded-full" : "rounded-md",
          // Base shimmer animation
          "before:absolute before:inset-0",
          "before:-translate-x-full",
          "before:animate-[shimmer_2s_infinite]",
          "before:bg-gradient-to-r",
          "before:from-transparent before:via-foreground/5 before:to-transparent",
          className
        )}
        style={skeletonStyle}
        {...props}
      />
    ));

    return count === 1 ? skeletons[0] : <>{skeletons}</>;
  }
);

ShimmerSkeleton.displayName = "ShimmerSkeleton";

/**
 * Skeleton for text lines
 */
const TextSkeleton: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className, lastLineWidth = "60%" }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <ShimmerSkeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
};

/**
 * Skeleton for avatar/profile images
 */
const AvatarSkeleton: React.FC<{
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ size = "md", className }) => {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return <ShimmerSkeleton circle className={cn(sizes[size], className)} />;
};

/**
 * Skeleton for cards
 */
const CardSkeleton: React.FC<{
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}> = ({ hasImage = false, hasActions = false, className }) => {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 space-y-4",
        className
      )}
    >
      {hasImage && (
        <ShimmerSkeleton className="h-40 w-full rounded-md" />
      )}
      <div className="space-y-3">
        <ShimmerSkeleton className="h-5 w-3/4" />
        <TextSkeleton lines={2} />
      </div>
      {hasActions && (
        <div className="flex gap-2 pt-2">
          <ShimmerSkeleton className="h-9 w-20" />
          <ShimmerSkeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton for list items
 */
const ListItemSkeleton: React.FC<{
  hasAvatar?: boolean;
  hasAction?: boolean;
  className?: string;
}> = ({ hasAvatar = true, hasAction = false, className }) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg",
        className
      )}
    >
      {hasAvatar && <AvatarSkeleton size="md" />}
      <div className="flex-1 space-y-2">
        <ShimmerSkeleton className="h-4 w-1/3" />
        <ShimmerSkeleton className="h-3 w-1/2" />
      </div>
      {hasAction && <ShimmerSkeleton className="h-8 w-16" />}
    </div>
  );
};

export {
  ShimmerSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  CardSkeleton,
  ListItemSkeleton,
};
