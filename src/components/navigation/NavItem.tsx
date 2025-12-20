
import React, { cloneElement, isValidElement, ReactElement } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideProps } from "lucide-react";
import { ICON_STROKE } from "@/styles/icon-system";
import { useSeasonalTheme } from "@/hooks/useSeasonalTheme";

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
  const { isWinterTheme } = useSeasonalTheme();
  const isActive = isActiveProp !== undefined ? isActiveProp : location.pathname === to;

  // Clone icon with stroke weight from icon system based on active state
  const styledIcon = isValidElement(icon)
    ? cloneElement(icon as ReactElement<LucideProps>, {
        strokeWidth: isActive ? ICON_STROKE.bold : ICON_STROKE.light,
      })
    : icon;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center transition-all duration-300 touch-manipulation",
        "relative text-center",
        "min-h-[44px] min-w-[44px] px-3 py-2", 
        // Default active/inactive states
        !isWinterTheme && (isActive
          ? "text-primary dark:text-white"
          : "text-muted-foreground hover:text-foreground"),
        // Winter theme states
        isWinterTheme && (isActive
          ? "nav-item-winter-active"
          : "text-slate-400 hover:text-cyan-200"),
        className
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Ice-glass pill behind active item (winter only) */}
      {isWinterTheme && isActive && (
        <div className="absolute inset-1 rounded-lg nav-pill-winter" />
      )}
      
      <div className="flex flex-col items-center relative z-10">
        {styledIcon && (
          <motion.div 
            className={cn(
              "mb-1", 
              !isWinterTheme && isActive && "text-primary dark:text-blue-300",
              isWinterTheme && isActive && "text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.5)]"
            )}
            animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {styledIcon}
          </motion.div>
        )}
        {label && (
          <span className={cn(
            "text-xs transition-all",
            isActive ? "font-semibold" : "font-normal",
            isWinterTheme && isActive && "text-cyan-200"
          )}>
            {label}
          </span>
        )}
      </div>
      <AnimatePresence>
        {isActive && (
          <motion.span 
            className={cn(
              "absolute bottom-0 left-0 right-0 mx-auto h-[3px] rounded-full origin-center w-2/3",
              // Default gradient
              !isWinterTheme && "bg-gradient-to-r from-cornhole-navy via-blue-600 to-amber-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] dark:from-blue-400 dark:via-blue-300 dark:to-amber-400",
              // Winter gradient
              isWinterTheme && "nav-indicator-winter"
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
