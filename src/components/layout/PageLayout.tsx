
import React, { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useIsMobile } from "@/hooks/use-mobile";

interface PageLayoutProps {
  children: ReactNode;
  withBackground?: boolean;
  className?: string;
}

/**
 * Standardized page layout component used across all main application pages
 */
const PageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  withBackground = true, 
  className = "" 
}) => {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  
  return (
    <div 
      className={`min-h-screen ${withBackground ? 'cornhole-bg' : ''} py-8 px-4 md:px-8 ${className} ${isMobile ? 'pb-24' : 'pb-8'}`}
      style={withBackground && resolvedTheme === 'light' ? { background: "#f8f8f8" } : {}}
    >
      {children}
    </div>
  );
};

export default PageLayout;
