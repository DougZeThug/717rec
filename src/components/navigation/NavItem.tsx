
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export const NavItem = ({ 
  to, 
  label, 
  icon, 
  isActive,
  className 
}: NavItemProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if this is the current active route
  const active = isActive !== undefined 
    ? isActive 
    : location.pathname === to;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(to);
  };
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex flex-col items-center justify-center transition-colors",
        "touch-manipulation relative",
        active 
          ? "text-cornhole-navy dark:text-white font-medium" 
          : "text-gray-500 dark:text-gray-400 hover:text-cornhole-navy dark:hover:text-white",
        className
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="mt-1 text-xs">{label}</span>
      {active && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/3 h-0.5 bg-cornhole-navy dark:bg-white rounded-full" />
      )}
    </button>
  );
};
