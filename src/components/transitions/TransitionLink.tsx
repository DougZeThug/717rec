import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { interactive } from "@/styles/design-system";

export interface TransitionLinkProps extends Omit<LinkProps, 'onClick'> {
  color?: string;
  duration?: number;
  noFeedback?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  variant?: 'default' | 'subtle' | 'underline';
}

export const TransitionLink: React.FC<TransitionLinkProps> = ({
  to,
  children,
  className,
  onClick,
  variant = 'default',
  noFeedback = false,
  ...rest
}) => {
  const getLinkStyle = () => {
    switch (variant) {
      case 'subtle':
        return interactive.link.subtle;
      case 'underline':
        return interactive.link.underline;
      default:
        return interactive.link.default;
    }
  };
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick handler if provided
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
  };

  return (
    <Link
      to={to}
      className={cn(
        "touch-manipulation min-h-[44px] min-w-[44px] flex items-center",
        getLinkStyle(),
        className
      )}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </Link>
  );
};
