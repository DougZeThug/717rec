
import React from 'react';
import { cn } from "@/lib/utils";
import { animations } from "@/styles/designSystem";

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
  const delayClass = {
    'none': '',
    'short': 'animation-delay-100',
    'medium': 'animation-delay-200',
    'long': 'animation-delay-300'
  };

  const animationClass = animations[animation];

  return (
    <div className={cn(
      'relative min-h-full w-full', 
      animationClass, 
      delayClass[delay]
    )}>
      {children}
    </div>
  );
};

export default PageTransition;
