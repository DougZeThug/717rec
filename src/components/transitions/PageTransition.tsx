
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');
  
  useEffect(() => {
    // Debug mount
    console.log('PageTransition component mounted');
    
    // Debug location changes
    return () => {
      console.log('PageTransition unmounted');
    };
  }, []);
  
  useEffect(() => {
    console.log(`Location changed: ${location.pathname}`);
    console.log(`Display location: ${displayLocation.pathname}`);
    
    // IMPORTANT: Always update to the new location immediately
    setDisplayLocation(location);
    
    // For visual transitions only, not blocking content update
    const direction = location.state?.swipeDirection || 'none';
    
    // Use a minimal animation that won't block content rendering
    setTransitionStage(
      direction === 'left' ? 'slideInRight' : 
      direction === 'right' ? 'slideInLeft' : 
      'fadeIn'
    );
    
    // Reset animation state after transition
    const timer = setTimeout(() => {
      console.log(`Transition complete to: ${location.pathname}`);
    }, 300); // Match the CSS duration
    
    return () => clearTimeout(timer);
  }, [location, displayLocation]);
  
  return (
    <div
      className={cn(
        'w-full transition-all duration-300 ease-in-out',
        {
          'opacity-100 transform-none': transitionStage === 'fadeIn',
          'opacity-0': transitionStage === 'fadeOut',
          'translate-x-full opacity-0': transitionStage === 'slideOutLeft',
          'translate-x-full opacity-100': transitionStage === 'slideInRight',
          '-translate-x-full opacity-0': transitionStage === 'slideOutRight',
          '-translate-x-full opacity-100': transitionStage === 'slideInLeft',
        }
      )}
      style={{ 
        position: 'relative',
        minHeight: '100vh' // Ensure consistent height during transitions
      }}
    >
      {/* Debug indicator for page transition container */}
      <div className="fixed top-0 left-0 bg-blue-500 text-white text-xs px-2 py-1 z-50">
        Route: {location.pathname}
      </div>
      {children}
    </div>
  );
};

export default PageTransition;
