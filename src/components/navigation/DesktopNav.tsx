
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
        "flex items-center px-4 py-2 rounded-full transition-colors",
        isActive 
          ? "bg-cornhole-cream text-cornhole-navy font-medium" 
          : "text-gray-600 hover:bg-gray-100"
      )}
    >
      <span className="mr-2">{icon}</span>
      <span>{label}</span>
    </Link>
  );
};

export const DesktopNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const navItems = [
    {
      path: "/stats",
      label: "Standings",
      icon: <Award size={18} />
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: <Calendar size={18} />
    },
    {
      path: "/teams",
      label: "Teams",
      icon: <Users size={18} />
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DesktopNav;
