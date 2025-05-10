
import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

/**
 * React hook to determine if the current viewport is mobile-sized
 * @returns {boolean} True if the viewport is considered mobile-sized
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Function to check if device is mobile based on viewport width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
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

// Both exports point to the same function for backward compatibility
export { useIsMobile as useMobile };
