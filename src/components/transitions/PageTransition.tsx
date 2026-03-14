import React, { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from '@/lib/utils';
import { animations } from '@/styles/design-system';
import { routeLog } from '@/utils/logger';

interface PageTransitionProps {
  children: React.ReactNode;
  delay?: 'none' | 'short' | 'medium' | 'long';
  animation?: 'fadeIn' | 'fadeInSlideUp' | 'fadeInSlideDown' | 'entranceLeft' | 'entranceRight';
  /** Skip animation to improve FCP for above-the-fold content */
  immediate?: boolean;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  delay = 'none',
  animation = 'fadeIn',
  immediate = false,
}) => {
  const location = useLocation();
  const { isNavigating } = useNavigation();

  useEffect(() => {
    routeLog(`Route changed to ${location.pathname}`);
  }, [location]);

  const delayClass = {
    none: '',
    short: 'animation-delay-100',
    medium: 'animation-delay-200',
    long: 'animation-delay-300',
  };

  const animationClass = animations[animation];

  // Check if this is an admin route to potentially apply different behavior
  const isAdminRoute = location.pathname === '/admin';

  // Skip animation for immediate content (improves FCP) or admin routes
  const shouldAnimate = !immediate && (!isAdminRoute || (isAdminRoute && !isNavigating));
  const finalAnimationClass = shouldAnimate ? animationClass : '';

  return (
    <div
      className={cn('relative', finalAnimationClass, delayClass[delay])}
      style={{
        // No CSS containment — Safari has bugs with contain:paint that suppress pointer events
      }}
    >
      {children}
    </div>
  );
};

export default PageTransition;
