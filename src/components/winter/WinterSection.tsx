import React from "react";
import { cn } from "@/lib/utils";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

interface WinterSectionProps {
  children: React.ReactNode;
  /** Show icicle trim on top of section */
  showIcicles?: boolean;
  /** Use lighter icicle variant for inner pages */
  lightIcicles?: boolean;
  className?: string;
}

/**
 * Wrapper component that adds winter styling to sections
 * - Adds icicle trim decoration on top when winter theme is active
 * - Provides consistent winter section styling
 */
const WinterSection: React.FC<WinterSectionProps> = ({
  children,
  showIcicles = true,
  lightIcicles = false,
  className,
}) => {
  const { isWinterTheme } = useSeasonalTheme();

  if (!isWinterTheme) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={cn(
        // Base winter section styling
        "winter-section relative",
        // Icicle trim variants
        showIcicles && (lightIcicles ? "icicle-trim-light" : "icicle-trim"),
        className
      )}
    >
      {children}
    </div>
  );
};

export default WinterSection;
