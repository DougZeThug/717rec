
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Function to check if device is mobile
    const checkMobile = () => {
      // Check for viewport width (primary method)
      const isMobileViewport = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(isMobileViewport);
    };
    
    // Initial check
    checkMobile();
    
    // Add event listener for resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
}

// Use this hook for consistency across the app
export const useIsMobile = useMobile;
