
import React, { useEffect } from 'react';
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";
import { useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';

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
    console.log(`PageTransition: Route changed to ${location.pathname}`);
    
    // Special handling for admin route
    if (location.pathname === '/admin') {
      console.log('PageTransition: Admin route detected');
      console.log('PageTransition state:', location.state);
      
      // Check if this is an app navigation (not a direct URL entry)
      if (location.state && (location.state as any).isAppNavigating) {
        console.log('PageTransition: App navigation to admin route');
      } else {
        console.log('PageTransition: Direct URL navigation to admin route');
      }
    }
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
    <div className={cn(
      'relative min-h-full w-full', 
      finalAnimationClass, 
      delayClass[delay]
    )}>
      {children}
    </div>
  );
};

export default PageTransition;
