
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { interactive, gradients } from "@/styles/design-system";
import { motion } from "framer-motion";

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
        "flex items-center justify-center transition-all duration-300 touch-manipulation",
        "relative text-center",
        "min-h-[44px] min-w-[44px] px-3 py-2", 
        isActive
          ? "text-cornhole-navy dark:text-white font-medium"
          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white",
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <div className="flex flex-col items-center">
        {icon && <div className={cn("mb-1", isActive && "text-cornhole-navy dark:text-blue-300")}>{icon}</div>}
        {label && <span className="text-sm font-medium">{label}</span>}
      </div>
      {isActive && (
        <motion.div 
          layoutId="bottomNavIndicator"
          className={cn(
            "absolute bottom-0 left-1/2 transform -translate-x-1/2 h-[3px] rounded-full",
            "bg-gradient-to-r from-cornhole-navy via-blue-600 to-amber-500",
            "w-2/3 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
            "dark:from-blue-400 dark:via-blue-300 dark:to-amber-400"
          )}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}
    </Link>
  );
};

export default NavItem;
