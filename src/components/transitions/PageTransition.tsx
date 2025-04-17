
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
    if (location.pathname !== displayLocation.pathname) {
      const direction = location.state?.swipeDirection || 'none';
      
      // Start transition out
      setTransitionStage(
        direction === 'left' ? 'slideOutLeft' : 
        direction === 'right' ? 'slideOutRight' : 
        'fadeOut'
      );
      
      // Wait for animation to complete before updating content
      const timer = setTimeout(() => {
        setDisplayLocation(location);
        
        // Start transition in
        setTransitionStage(
          direction === 'left' ? 'slideInRight' : 
          direction === 'right' ? 'slideInLeft' : 
          'fadeIn'
        );
      }, 300); // Match the CSS duration
      
      return () => clearTimeout(timer);
    }
  }, [location, displayLocation]);
  
  return (
    <div
      className={cn(
        'w-full transition-all duration-300 ease-in-out will-change-transform will-change-opacity',
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
      {children}
    </div>
  );
};

export default PageTransition;
