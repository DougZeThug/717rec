import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, Calendar, BarChart3, Trophy, Clock, MessageSquare, HelpCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { ICON_SIZES, ICON_STROKE } from "@/styles/icon-system";

interface NavLinksProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ isMobile = false, onLinkClick }) => {
  const { isAdminAccessGranted } = useAdminAccess();
  const activeClass = "bg-white/20 dark:bg-slate-700 text-white dark:text-white";
  const baseClass = isMobile
    ? "flex items-center w-full px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors"
    : "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent hover:text-muted-foreground h-9 px-4";

  const handleLinkClick = () => {
    if (onLinkClick) {
      onLinkClick();
    }
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/teams", label: "Teams", icon: Users },
    { href: "/schedule", label: "Schedule", icon: Calendar },
    { href: "/stats", label: "Standings", icon: BarChart3 },
    { href: "/playoffs", label: "Playoffs", icon: Trophy },
    { href: "/history", label: "History", icon: Clock },
    { href: "/message-board", label: "Messages", icon: MessageSquare },
    { href: "/help", label: "Help", icon: HelpCircle },
    { href: "/contact", label: "Contact", icon: Mail },
  ];

  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          onClick={handleLinkClick}
          className={({ isActive }) =>
            cn(baseClass, isActive && !isMobile ? activeClass : undefined)
          }
        >
          {({ isActive }) => (
            <>
              <item.icon 
                size={ICON_SIZES.md} 
                strokeWidth={isActive ? ICON_STROKE.bold : ICON_STROKE.normal}
                className={isMobile ? "mr-3" : "mr-2"} 
              />
              <span className={isMobile ? "text-base" : ""}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
};

export default NavLinks;
