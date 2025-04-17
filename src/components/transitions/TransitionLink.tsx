
import React from 'react';
import { Link, LinkProps, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Debug log to verify that click handler is triggered
    console.log(`TransitionLink clicked: navigating to ${to.toString()}`);
    
    // Get current path and target path
    const currentPath = location.pathname;
    const targetPath = to.toString();
    
    // Still check if we're already on this page, but don't block subpages
    if (currentPath === targetPath) {
      console.log(`Already on ${targetPath}, not navigating`);
      return;
    }
    
    console.log(`Navigating from ${currentPath} to ${targetPath}`);
    
    // Get the click coordinates for the ripple effect origin
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Get the element bounds as fallback
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Use position of the click, or fallback to center of element
    const x = clickX || (rect.left + rect.width / 2);
    const y = clickY || (rect.top + rect.height / 2);

    // Call navigateWithTransition with the target path
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
