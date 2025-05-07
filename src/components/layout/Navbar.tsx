
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const { isAdminAccessGranted } = useAdminAccess();
  
  // Base nav items that everyone can see
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Teams", href: "/teams" },
    { label: "Schedule", href: "/schedule" },
    { label: "Standings", href: "/stats" },
    { label: "Playoffs", href: "/playoffs" },
  ];
  
  // Add Admin link only for users with admin access
  const allNavItems = [
    ...navItems,
    ...(isAdminAccessGranted ? [{ label: "Admin", href: "/admin" }] : [])
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <nav className="bg-cornhole-navy dark:bg-gray-900 text-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-[14px] md:py-[17px]">
        <div className="flex justify-between items-center py-[4px]">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 mr-6">
              <img src="/lovable-uploads/faa54084-d274-43b9-9862-5544b188b4ca.png" alt="717Rec League Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bebas tracking-wider">717Rec</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {allNavItems.map(item => (
              <Link key={item.href} to={item.href}>
                <Button 
                  variant={isActive(item.href) ? "secondary" : "ghost"} 
                  className={cn(
                    isActive(item.href) 
                      ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" 
                      : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800",
                    "min-h-11 px-4"
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
            
            {/* Add user menu and theme toggle with proper spacing */}
            <div className="ml-4 flex items-center gap-3">
              <UserMenu />
              <ThemeToggle className="ml-1" />
            </div>
          </div>

          <div className="md:hidden flex items-center gap-3">
            {/* User menu for mobile */}
            <UserMenu />
            
            {/* Theme toggle for mobile */}
            <ThemeToggle size="sm" />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-white min-h-11 min-w-11" 
              onClick={toggleMobileMenu}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pt-2 pb-3 space-y-1">
            {allNavItems.map(item => (
              <Link 
                key={item.href} 
                to={item.href} 
                onClick={() => setMobileMenuOpen(false)} 
                className="block touch-manipulation"
              >
                <Button 
                  variant={isActive(item.href) ? "secondary" : "ghost"} 
                  className={cn(
                    isActive(item.href) 
                      ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 w-full justify-start" 
                      : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800 w-full justify-start",
                    "min-h-11 py-3"
                  )}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
