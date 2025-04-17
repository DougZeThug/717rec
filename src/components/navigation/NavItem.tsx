
import React from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TransitionLink } from "@/components/transitions/TransitionLink";
import { getButtonInteractionStyles } from "@/styles/interactionUtils";

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
  
  // Check if this is the current active route
  // Use either the explicit isActive prop, or check if current path starts with this route
  const active = isActive !== undefined 
    ? isActive 
    : location.pathname === to || 
      (to !== '/' && location.pathname.startsWith(to));
  
  return (
    <TransitionLink 
      to={to} 
      className={cn(
        "flex items-center justify-center transition-colors",
        active 
          ? "text-cornhole-navy font-medium" 
          : "text-gray-500 hover:text-cornhole-navy",
        getButtonInteractionStyles("outline-none"),
        className
      )}
    >
      <div className="flex flex-col items-center">
        {icon}
        <span className="mt-1">{label}</span>
      </div>
    </TransitionLink>
  );
};
