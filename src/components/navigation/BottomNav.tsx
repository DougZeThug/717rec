
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const NavItem = ({ 
  to, 
  label, 
  icon, 
  isActive 
}: { 
  to: string; 
  label: string; 
  icon: React.ReactNode;
  isActive: boolean;
}) => {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center px-3 py-2 text-xs transition-colors",
        isActive 
          ? "text-cornhole-navy font-medium" 
          : "text-gray-500 hover:text-cornhole-navy"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-full transition-colors mb-1",
        isActive ? "bg-cornhole-cream text-cornhole-navy" : "text-gray-500"
      )}>
        {icon}
      </div>
      <span>{label}</span>
    </Link>
  );
};

export const BottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const navItems = [
    {
      path: "/stats",
      label: "Standings",
      icon: <Award size={20} />
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: <Calendar size={20} />
    },
    {
      path: "/teams",
      label: "Teams",
      icon: <Users size={20} />
    }
  ];

  // Don't render on desktop if specified
  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-1 shadow-[0_-1px_5px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            isActive={location.pathname === item.path}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
