
import React from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

// Import component files
import NavBrand from "./navbar/NavBrand";
import NavLinks from "./navbar/NavLinks";
import NavActions from "./navbar/NavActions";
import MobileMenu from "./navbar/MobileMenu";

const Navbar: React.FC = () => {
  // Base nav items that everyone can see
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Teams", href: "/teams" },
    { label: "Schedule", href: "/schedule" },
    { label: "Standings", href: "/stats" },
    { label: "Playoffs", href: "/playoffs" },
  ];
  
  return (
    <nav className={cn(
      "text-white shadow-lg sticky top-0 z-50 safe-area-top",
      "bg-gradient-to-r from-[#0f2647] via-cornhole-navy to-[#1d4068]",
      "dark:from-gray-900 dark:via-gray-900 dark:to-gray-800",
    )}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-[8px] md:py-[4px]">
          <div className="flex items-center">
            <NavBrand />
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <NavLinks />
            
            {/* Add desktop nav actions with proper spacing */}
            <NavActions className="ml-4" />
          </div>

          {/* Mobile menu with hamburger */}
          <MobileMenu navItems={navItems} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
