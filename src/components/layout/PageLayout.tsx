
import React, { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";

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
      className={`min-h-screen ${withBackground ? 'cornhole-bg' : ''} 
        ${isMobile ? (compact ? 'py-3 pb-20' : 'py-4 pb-24') : 'py-8 pb-8'} 
        px-4 md:px-8 ${className}`}
      style={withBackground && resolvedTheme === 'light' ? { background: "#f8f8f8" } : {}}
    >
      {children}
    </div>
  );
};

export default PageLayout;
