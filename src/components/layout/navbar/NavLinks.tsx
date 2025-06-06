
import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, Calendar, BarChart3, Trophy, Clock, CalendarClock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface NavLinksProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ isMobile = false, onLinkClick }) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const activeClass = "bg-gray-100 dark:bg-slate-700";
  const baseClass =
    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent hover:text-muted-foreground h-9 px-4";

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/playoffs", label: "Playoffs", icon: Trophy },
    { href: "/history", label: "History", icon: Clock },
    // Only show timeslots for admin users
    ...(isAdminAccessGranted ? [{ href: "/timeslots", label: "Timeslots", icon: CalendarClock }] : []),
    { href: "/message-board", label: "Messages", icon: MessageSquare },
  ];

  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          onClick={handleLinkClick}
          className={({ isActive }) =>
            cn(baseClass, isActive ? activeClass : undefined)
          }
        >
          <item.icon className="mr-2 h-4 w-4" />
          {isMobile ? null : item.label}
        </NavLink>
      ))}
    </>
  );
};

export default NavLinks;
