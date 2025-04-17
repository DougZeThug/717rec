
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
  const active = isActive !== undefined ? isActive : location.pathname === to;
  
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
      {icon}
      <span>{label}</span>
    </TransitionLink>
  );
};
