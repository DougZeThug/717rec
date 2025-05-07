
import React, { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";

interface PageLayoutProps {
  children: ReactNode;
  withBackground?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * Standardized page layout component used across all main application pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  withBackground = true, 
  className = "",
  compact = false
}) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  
  return (
    <div 
      className={cn(
        "min-h-screen",
        withBackground ? "cornhole-bg" : "",
        isMobile ? (compact ? "py-3 pb-[calc(5rem+var(--sab))]" : "py-4 pb-[calc(6rem+var(--sab))]") : "py-8 pb-8", 
        "px-4 md:px-8",
        animations.fadeIn,
        className
      )}
      style={withBackground && resolvedTheme === 'light' ? { background: "#f8f8f8" } : {}}
    >
      {children}
    </div>
  );
};

export default PageLayout;
