
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface NavItemProps {
  to: string;
  label: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  label,
  icon,
  isActive: isActiveProp,
  className,
  onClick,
}) => {
  const location = useLocation();
  const isActive = isActiveProp !== undefined ? isActiveProp : location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-colors duration-200 touch-manipulation",
        "relative text-center",
        "min-h-[44px] min-w-[44px] md:min-h-[48px] md:min-w-[48px]", // Ensure good touch targets
        isActive
          ? "text-cornhole-navy dark:text-white font-medium"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      {label && <span className="ml-2 md:ml-1.5">{label}</span>}
      {isActive && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-cornhole-navy dark:bg-white rounded-full" />
      )}
    </Link>
  );
};

export default NavItem;
