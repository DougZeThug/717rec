
import React, { ReactNode } from "react";
import { useThemeConsistency } from "@/hooks/use-theme-consistency";
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
  const isMobile = useIsMobile();
  
  const getGradientClass = () => {
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
        "min-h-screen transition-colors duration-300",
        getGradientClass(),
        isMobile ? (compact ? "py-3 pb-[calc(5rem+var(--sab))]" : "py-3 pb-[calc(6rem+var(--sab))]") : "py-5 pb-6", 
        "px-1 sm:px-3 md:px-4 lg:px-5",
        animations.fadeIn,
        className
      )}
      style={withBackground && !isDark ? { background: "#f8f8f8" } : {}}
    >
      <div className="max-w-full w-full">
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
