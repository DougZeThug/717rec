
import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router';
import { cn } from "@/lib/utils";

export interface RouterLinkProps extends Omit<LinkProps, 'onClick'> {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * A Link component that handles navigation through React Router
 * Allows default navigation behavior to work properly
 */
export const RouterLink: React.FC<RouterLinkProps> = ({
  to,
  children,
  className,
  onClick,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      // Allow event propagation to continue for React Router's default navigation
    }
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

export default RouterLink;
