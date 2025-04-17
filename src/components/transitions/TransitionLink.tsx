
import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
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

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX;
    const clickY = e.clientY;

    // Use position of the click, or fallback to center of element
    const x = clickX || (rect.left + rect.width / 2);
    const y = clickY || (rect.top + rect.height / 2);

    navigateWithTransition(to.toString(), { 
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
