
import React from "react";
import { useLocation } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";

export const BottomNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const navItems = [
    {
      path: "/stats",
      label: "Standings",
      icon: <Award size={20} className="mb-1" />
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: <Calendar size={20} className="mb-1" />
    },
    {
      path: "/teams",
      label: "Teams",
      icon: <Users size={20} className="mb-1" />
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
            className="flex-col px-3 py-2 text-xs"
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
