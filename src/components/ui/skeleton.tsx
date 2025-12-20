import { cn } from "@/lib/utils"

type SkeletonVariant = "card" | "input" | "pill";

const variantClasses: Record<SkeletonVariant, string> = {
  card: "rounded-card",
  input: "rounded-input",
  pill: "rounded-pill",
};

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Radius variant matching design tokens */
  variant?: SkeletonVariant;
}

function Skeleton({
  className,
  variant = "input",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        variantClasses[variant],
        // Shimmer animation
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-foreground/5 before:to-transparent",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
