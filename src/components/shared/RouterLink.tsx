
import React from 'react';
import { Link, LinkProps, useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

export interface RouterLinkProps extends Omit<LinkProps, 'onClick'> {
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const RouterLink: React.FC<RouterLinkProps> = ({
  to,
  children,
  className,
  onClick,
  ...rest
}) => {
  const navigate = useNavigate();
  
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) return;
    }
    
    e.preventDefault();
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
