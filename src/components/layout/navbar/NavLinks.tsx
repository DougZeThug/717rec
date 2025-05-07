
import React from "react";
import { Button } from "@/components/ui/button";
import { RouterLink } from "@/components/navigation";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/contexts/NavigationContext";

interface NavLinkItem {
  label: string;
  href: string;
  isAdmin?: boolean;
}

interface NavLinksProps {
  items: NavLinkItem[];
  isMobile?: boolean;
  onNavItemClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = ({ 
  items, 
  isMobile = false,
  onNavItemClick 
}) => {
  const location = useLocation();
  const { navigateWithTransition } = useNavigation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Special handler for admin navigation to ensure it works correctly
  const handleNavigation = (href: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Special handling for admin route
    if (href === "/admin") {
      console.log("Navbar: Admin link clicked");
    }
    
    console.log(`Navbar: Navigating to: ${href} using navigateWithTransition`);
    navigateWithTransition(href);
    
    if (onNavItemClick) onNavItemClick();
  };

  return (
    <>
      {items.map(item => (
        <div key={item.href} className={cn("block touch-manipulation", isMobile && "w-full")}>
          {item.label === "Admin" ? (
            <Button 
              variant={isActive(item.href) ? "secondary" : "ghost"} 
              className={cn(
                isActive(item.href) 
                  ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" 
                  : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800",
                "min-h-11",
                isMobile && "w-full justify-start py-3",
                !isMobile && "px-4"
              )}
              onClick={(e) => handleNavigation(item.href, e)}
            >
              {item.label}
            </Button>
          ) : (
            <RouterLink 
              to={item.href} 
              onClick={() => {
                if (onNavItemClick) onNavItemClick();
              }} 
              className="block"
            >
              <Button 
                variant={isActive(item.href) ? "secondary" : "ghost"} 
                className={cn(
                  isActive(item.href) 
                    ? "bg-white text-cornhole-navy hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600" 
                    : "text-white hover:bg-cornhole-navy-light dark:hover:bg-gray-800",
                  "min-h-11",
                  isMobile && "w-full justify-start py-3",
                  !isMobile && "px-4"
                )}
              >
                {item.label}
              </Button>
            </RouterLink>
          )}
        </div>
      ))}
    </>
  );
};

export default NavLinks;
