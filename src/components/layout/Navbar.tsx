import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ui/theme/ThemeToggle";
import UserMenu from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { cn } from "@/lib/utils";
import { RouterLink } from "@/components/navigation";
import { useNavigation } from "@/contexts/NavigationContext";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, resolvedTheme } = useTheme();
  const { user, profile } = useAuth();
  const { isAdminAccessGranted } = useAdminAccess();
  const { navigateWithTransition } = useNavigation();
  
  // Log admin status on render
  useEffect(() => {
    console.log("Navbar: Rendering with admin status:", isAdminAccessGranted);
    console.log("Navbar: User profile:", profile);
  }, [isAdminAccessGranted, profile]);
  
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
  
  // Special handler for admin navigation to ensure it works correctly
  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Special handling for admin route
    if (href === "/admin") {
      console.log("Navbar: Admin link clicked");
      console.log("Navbar: Current admin status:", isAdminAccessGranted);
    }
    
    console.log(`Navbar: Navigating to: ${href} using navigateWithTransition`);
    navigateWithTransition(href);
    
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  // Message board navigation handler
  const handleMessageBoardClick = () => {
    navigateWithTransition('/message-board');
  };
  
  return (
    <nav className="bg-cornhole-navy dark:bg-gray-900 text-white shadow-lg sticky top-0 z-50 safe-area-top">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-[8px] md:py-[4px]">
          <div className="flex items-center">
            <RouterLink to="/" className="flex items-center space-x-2 mr-6">
              <img src="/lovable-uploads/faa54084-d274-43b9-9862-5544b188b4ca.png" alt="717Rec League Logo" className="h-8 w-8 object-contain" />
              <span className="text-xl font-bebas tracking-wider">717Rec</span>
            </RouterLink>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {allNavItems.map(item => (
              <div key={item.href}>
                {item.label === "Admin" ? (
                  <Button 
                    variant={isActive(item.href) ? "secondary" : "ghost"} 
                    className={cn(
                      isActive(item.href) 
                        ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" 
                        : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800",
                      "min-h-11 px-4"
                    )}
                    onClick={(e) => handleNavigation(item.href, e)}
                  >
                    {item.label}
                  </Button>
                ) : (
                  <RouterLink to={item.href}>
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
                  </RouterLink>
                )}
              </div>
            ))}
            
            {/* Add user menu, message board icon and theme toggle with proper spacing */}
            <div className="ml-4 flex items-center gap-3">
              <UserMenu />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleMessageBoardClick}
                className={cn(
                  "rounded-full text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-700/80",
                  isActive("/message-board") && "bg-cornhole-navy-light dark:bg-gray-700"
                )}
                aria-label="Message Board"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
              <ThemeToggle className="ml-1" />
            </div>
          </div>

          <div className="md:hidden flex items-center gap-3">
            {/* User menu for mobile */}
            <UserMenu />
            
            {/* Message Board button for mobile */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleMessageBoardClick}
              className={cn(
                "rounded-full text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-700/80",
                isActive("/message-board") && "bg-cornhole-navy-light dark:bg-gray-700"
              )}
              aria-label="Message Board"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            
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
              <div key={item.href} className="block touch-manipulation">
                {item.label === "Admin" ? (
                  <Button 
                    variant={isActive(item.href) ? "secondary" : "ghost"} 
                    className={cn(
                      isActive(item.href) 
                        ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 w-full justify-start" 
                        : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800 w-full justify-start",
                      "min-h-11 py-3"
                    )}
                    onClick={() => handleNavigation(item.href)}
                  >
                    {item.label}
                  </Button>
                ) : (
                  <RouterLink 
                    to={item.href} 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="block"
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
                  </RouterLink>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
