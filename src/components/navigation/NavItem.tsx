
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
        {icon && (
          <motion.div 
            className={cn("mb-1", isActive && "text-cornhole-navy dark:text-blue-300")}
            animate={isActive ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {icon}
          </motion.div>
        )}
        {label && <span className="text-sm font-medium">{label}</span>}
      </div>
      <AnimatePresence>
        {isActive && (
          <motion.span 
            className={cn(
              "absolute bottom-0 left-0 right-0 mx-auto h-[3px] rounded-full origin-center",
              "bg-gradient-to-r from-cornhole-navy via-blue-600 to-amber-500",
              "w-2/3 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
              "dark:from-blue-400 dark:via-blue-300 dark:to-amber-400"
            )}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </Link>
  );
};

export default NavItem;
