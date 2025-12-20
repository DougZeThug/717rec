import React, { ReactNode } from "react";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";
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
  gradientVariant = 'blueOrange'
}) => {
  const { isDark } = useThemeConsistency();
  const { shouldApplyWinter, isWinterTheme } = useSeasonalTheme();
  const isMobile = useIsMobile();
  
  const getGradientClass = () => {
    // Winter theme background for homepage
    if (shouldApplyWinter) {
      return "page-winter-bg";
    }
    
    if (!withBackground) return "";
    
    switch(gradientVariant) {
      case 'blue':
        return cn(
          "bg-gradient-to-br",
          isDark
            ? "from-gray-900 via-gray-800/95 to-gray-900/90"
            : "from-blue-50 via-white to-blue-50/30"
        );
      case 'blueOrange':
        return gradients.section.blueOrangeSubtle;
      default:
        return "cornhole-bg";
    }
  };
  
  return (
    <div 
      className={cn(
        "min-h-screen transition-colors duration-300 overflow-x-hidden",
        getGradientClass(),
        isMobile ? (compact ? "py-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]" : "py-3 pb-[calc(5rem+env(safe-area-inset-bottom,0px))]") : "py-5 pb-6", 
        "px-1 sm:px-3 md:px-4 lg:px-5",
        animations.fadeIn,
        // Add winter pattern and ice pattern for homepage
        shouldApplyWinter && "winter-pattern ice-pattern-bg relative",
        className
      )}
      style={withBackground && !isDark && !isWinterTheme ? { background: "#f8f8f8" } : {}}
    >
      <div className="max-w-full w-full relative z-10">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
