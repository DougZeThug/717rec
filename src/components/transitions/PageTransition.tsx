
import React, { useEffect } from 'react';
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";
import { useLocation } from 'react-router-dom';

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
  
  useEffect(() => {
    console.log(`PageTransition: Route changed to ${location.pathname}`);
    
    // Special handling for admin route
    if (location.pathname === '/admin') {
      console.log('PageTransition: Admin route detected');
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
  const finalAnimationClass = isAdminRoute ? '' : animationClass;

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
