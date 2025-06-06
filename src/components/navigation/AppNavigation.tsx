
import React from "react";
import BottomNav from "./BottomNav";
import DesktopNav from "./DesktopNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Home, Users, Calendar, BarChart3, Trophy, Clock } from "lucide-react";

export const AppNavigation: React.FC = () => {
  const isMobile = useIsMobile();
  
  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/playoffs", label: "Playoffs", icon: Trophy },
    { href: "/history", label: "History", icon: Clock },
    // Note: Timeslots is not included in bottom/desktop nav as it's admin-only
  ];

  return (
    <>
      {isMobile && <BottomNav />}
      {!isMobile && <DesktopNav />}
    </>
  );
};

export default AppNavigation;
