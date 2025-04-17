
import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

export interface TransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  color?: string;
  duration?: number;
  noFeedback?: boolean;
}

export const TransitionLink: React.FC<TransitionLinkProps> = ({
  to,
  children,
  className,
  noFeedback = false,
  ...rest
}) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Debug log to verify that click handler is triggered
    console.log(`TransitionLink clicked: direct navigation to ${to.toString()}`);
    
    // Use direct navigation without any transitions
    navigate(to.toString(), { state: rest.state });
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
