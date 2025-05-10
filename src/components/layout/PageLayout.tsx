
import React, { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { animations, gradients } from "@/styles/design-system";

interface PageLayoutProps {
  children: ReactNode;
  withBackground?: boolean;
  className?: string;
  compact?: boolean;
  gradientVariant?: 'default' | 'blue' | 'blueOrange';
}

/**
 * Standardized page layout component used across all main application pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  withBackground = true, 
  className = "",
  compact = false,
  gradientVariant = 'default'
}) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  
  const getGradientClass = () => {
    if (!withBackground) return "";
    
    switch(gradientVariant) {
      case 'blue':
        return "bg-gradient-to-br from-blue-50 via-white to-blue-50/30 dark:from-gray-900 dark:via-gray-800/95 dark:to-gray-900/90";
      case 'blueOrange':
        return gradients.section.blueOrangeSubtle;
      default:
        return "cornhole-bg";
    }
  };
  
  return (
    <div 
      className={cn(
        "min-h-screen",
        getGradientClass(),
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
