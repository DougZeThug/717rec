
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();

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

  if (!isMobile) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 shadow-[0_-4px_16px_rgba(30,58,95,0.08)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center max-w-md mx-auto pt-3 pb-[var(--sab)] mb-1">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            className={cn(
              "flex-1 min-h-[50px] px-3 py-1 text-xs touch-manipulation",
              "flex flex-col items-center justify-center"
            )}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
