
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Users, Calendar, BarChart3, Trophy, Clock, MessageSquare } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { cn } from "@/lib/utils";

const NavExpandableTabs: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation items for expandable tabs
  const navItems = [
    { type: "tab" as const, title: "Home", icon: Home, href: "/" },
    { type: "tab" as const, title: "Teams", icon: Users, href: "/teams" },
    { type: "tab" as const, title: "Schedule", icon: Calendar, href: "/schedule" },
    { type: "tab" as const, title: "Stats", icon: BarChart3, href: "/stats" },
    { type: "tab" as const, title: "Playoffs", icon: Trophy, href: "/playoffs" },
    { type: "tab" as const, title: "History", icon: Clock, href: "/history" },
    { type: "tab" as const, title: "Messages", icon: MessageSquare, href: "/message-board" },
  ];

  // Get current selected tab index
  const currentIndex = navItems.findIndex(item => item.href === location.pathname);
  const selectedTab = currentIndex >= 0 ? currentIndex : null;

  const handleTabChange = (index: number | null) => {
    if (index !== null && navItems[index]) {
      navigate(navItems[index].href);
    }
  };

  return (
    <ExpandableTabs
      tabs={navItems}
      activeColor="text-white dark:text-white"
      onChange={handleTabChange}
      className={cn(
        "bg-white/10 dark:bg-gray-700/50 border-white/20 dark:border-gray-600/50",
        "[&>button]:text-white dark:[&>button]:text-white",
        "[&>button]:hover:text-white dark:[&>button]:hover:text-white",
        "[&>button]:hover:bg-white/20 dark:[&>button]:hover:bg-gray-600/50",
        "[&>button[data-state=active]]:bg-white/20 dark:[&>button[data-state=active]]:bg-gray-700",
        "[&>button[data-state=active]]:text-white dark:[&>button[data-state=active]]:text-white"
      )}
    />
  );
};

export default NavExpandableTabs;
