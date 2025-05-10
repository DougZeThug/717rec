
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { gradients } from "@/styles/design-system";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

  const navItems = [
    {
      path: "/stats",
      label: "Standings",
      icon: <Award size={24} />
    },
    {
      path: "/schedule",
      label: "Schedule",
      icon: <Calendar size={24} />
    },
    {
      path: "/teams",
      label: "Teams",
      icon: <Users size={24} />
    }
  ];

  if (!isMobile) {
    return null;
  }

  return (
    <nav className={cn(
      "fixed bottom-[var(--sab)] left-0 right-0 z-40 mt-[-0.75rem] border-t", 
      "border-gray-300 dark:border-gray-700/50",
      "shadow-[0_-4px_16px_rgba(30,58,95,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]",
      "bg-gradient-to-r from-white via-gray-50 to-white",
      "dark:from-gray-900 dark:via-gray-800 dark:to-gray-900",
    )}>
      <div className="flex justify-around items-center max-w-md mx-auto h-16">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            className={cn(
              "flex-1 px-3 py-1.5 text-sm",
              "flex flex-col items-center justify-center",
              location.pathname === item.path && 
                "bg-gradient-to-b from-transparent to-blue-50/40 dark:to-blue-900/10"
            )}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
