
import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

export interface TransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  color?: string;
  duration?: number;
  noFeedback?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const TransitionLink: React.FC<TransitionLinkProps> = ({
  to,
  children,
  className,
  onClick,
  noFeedback = false,
  ...rest
}) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick handler if provided
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
    
    e.preventDefault();
    
    // Debug log to verify that click handler is triggered
    console.log(`TransitionLink clicked: direct navigation to ${to.toString()}`);
    
    // Use direct navigation with no transitions or blocking
    navigate(to.toString());
  };

  return (
    <Link
      to={to}
      className={cn(className)}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  );
};
