
import React from 'react';
import { Link, LinkProps, useLocation } from 'react-router-dom';
import { useNavigation } from '@/contexts/NavigationContext';
import { cn } from "@/lib/utils";

export interface TransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  color?: string;
  duration?: number;
  noFeedback?: boolean;
}

export const TransitionLink: React.FC<TransitionLinkProps> = ({
  to,
  color,
  duration,
  children,
  className,
  noFeedback = false,
  ...rest
}) => {
  const { navigateWithTransition } = useNavigation();
  const location = useLocation();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Get current path and target path
    const currentPath = location.pathname;
    const targetPath = to.toString();
    
    // Check if we're already on this page or a subpage of it
    if (currentPath === targetPath || 
        (targetPath !== '/' && currentPath.startsWith(targetPath))) {
      // We're already on this page, do nothing
      return;
    }
    
    // Get the click coordinates for the ripple effect origin
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Get the element bounds as fallback
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Use position of the click, or fallback to center of element
    const x = clickX || (rect.left + rect.width / 2);
    const y = clickY || (rect.top + rect.height / 2);

    navigateWithTransition(targetPath, { 
      x, 
      y, 
      color, 
      duration, 
      state: rest.state 
    });
  };

  return (
    <Link
      to={to}
      className={cn(
        !noFeedback && "active:scale-[0.98] transition-transform duration-150",
        className
      )}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  );
};
