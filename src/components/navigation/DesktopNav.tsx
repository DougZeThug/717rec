
import React from "react";
import { useLocation } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";
import { useTheme } from "next-themes";
import { gradients } from "@/styles/design-system";
import CommandPalette from "@/components/navigation/CommandPalette";

export const DesktopNav = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  
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
    <div className={cn(
      "border-b border-gray-200 dark:border-gray-700 mb-4 py-[16px]",
      "bg-gradient-to-r from-white via-gray-50 to-white",
      "dark:from-gray-800/90 dark:via-gray-800 dark:to-gray-800/90",
    )}>
      <div className="container mx-auto flex items-center justify-between py-[15px] px-4">
        <div className="flex-1" /> {/* Spacer */}
        
        <div className="flex space-x-2">
          {navItems.map(item => (
            <NavItem 
              key={item.path} 
              to={item.path} 
              label={item.label} 
              icon={item.icon} 
              isActive={location.pathname === item.path} 
              className={cn(
                "px-4 py-2 rounded-full transition-all duration-300", 
                location.pathname === item.path 
                  ? cn(
                      "bg-gradient-to-br from-cornhole-cream to-cornhole-cream/80",
                      "dark:from-gray-700 dark:to-gray-800 dark:text-white",
                      "shadow-sm"
                    )
                  : cn(
                      "hover:bg-gradient-to-br hover:from-white hover:to-gray-100",
                      "dark:hover:from-gray-800 dark:hover:to-gray-700",
                      "dark:text-gray-200"
                    )
              )} 
            />
          ))}
        </div>
        
        <div className="flex-1 flex justify-end">
          <CommandPalette />
        </div>
      </div>
    </div>
  );
};

export default DesktopNav;
