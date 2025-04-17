
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
  
  console.log(`NavItem: ${to}, Current path: ${location.pathname}, Active: ${active}`);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log(`NavItem: direct navigation to ${to}`);
    navigate(to);
  };
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center transition-colors",
        active 
          ? "text-cornhole-navy font-medium" 
          : "text-gray-500 hover:text-cornhole-navy",
        className
      )}
    >
      <div className="flex flex-col items-center">
        {icon}
        <span className="mt-1">{label}</span>
        {/* DEBUG: Visual indicator to confirm navigation */}
        {active && <span className="text-xs bg-green-500 text-white px-1 rounded-sm">Active</span>}
      </div>
    </button>
  );
};
