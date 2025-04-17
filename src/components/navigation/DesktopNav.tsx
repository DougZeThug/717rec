
import React from "react";
import { useLocation } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";

export const DesktopNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const navItems = [
    {
      path: "/stats",
      label: "Standings",
      icon: <Award size={18} className="mr-2" />
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: <Calendar size={18} className="mr-2" />
    },
    {
      path: "/teams",
      label: "Teams",
      icon: <Users size={18} className="mr-2" />
    }
  ];

  // Don't render on mobile
  if (isMobile) return null;

  return (
    <div className="bg-white py-4 border-b border-gray-200 mb-4">
      <div className="container mx-auto flex justify-center">
        <div className="flex space-x-2">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              label={item.label}
              icon={item.icon}
              isActive={location.pathname === item.path}
              className={cn(
                "px-4 py-2 rounded-full",
                location.pathname === item.path 
                  ? "bg-cornhole-cream" 
                  : "hover:bg-gray-100"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DesktopNav;
