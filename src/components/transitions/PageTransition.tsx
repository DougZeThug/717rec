
import React, { useEffect } from 'react';
import { cn } from "@/lib/utils";
import { animations } from "@/styles/design-system";
import { useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { routeLog } from "@/utils/logger";

interface PageTransitionProps {
  children: React.ReactNode;
  delay?: 'none' | 'short' | 'medium' | 'long';
  animation?: 'fadeIn' | 'fadeInSlideUp' | 'fadeInSlideDown' | 'entranceLeft' | 'entranceRight';
}

export const PageTransition: React.FC<PageTransitionProps> = ({ 
  children, 
  delay = 'none',
  animation = 'fadeIn'
}) => {
  const location = useLocation();
  const { isNavigating } = useNavigation();
  
  useEffect(() => {
    routeLog(`Route changed to ${location.pathname}`);
  }, [location]);
  
  const delayClass = {
    'none': '',
    'short': 'animation-delay-100',
    'medium': 'animation-delay-200',
    'long': 'animation-delay-300'
  };

  const animationClass = animations[animation];
  
  // Check if this is an admin route to potentially apply different behavior
  const isAdminRoute = location.pathname === '/admin';
  
  // Always apply animation for transitions, except when navigating to admin from within the app
  const shouldAnimate = !isAdminRoute || (isAdminRoute && !isNavigating);
  const finalAnimationClass = shouldAnimate ? animationClass : '';

  return (
    <div 
      className={cn(
        'relative', 
        finalAnimationClass, 
        delayClass[delay]
      )}
      style={{ 
        // Reserve space to prevent layout shift
        contain: 'layout style paint',
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
