
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Award, Calendar, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavItem } from "@/components/navigation/NavItem";

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  useEffect(() => {
    // For debugging route changes
    // console.log("BottomNav: Current route is:", location.pathname);
  }, [location.pathname]);

  if (!isMobile) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 py-2 shadow-[0_-2px_16px_rgba(30,58,95,0.04)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            className="flex-1 min-h-[44px] px-3 py-2 text-xs"
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
