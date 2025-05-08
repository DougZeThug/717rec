
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";
import NavActions from "./NavActions";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface MobileMenuProps {
  navItems: Array<{ label: string; href: string }>;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ navItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdminAccessGranted } = useAdminAccess();
  
  // Add Admin link only for users with admin access
  const allNavItems = [
    ...navItems,
    ...(isAdminAccessGranted ? [{ label: "Admin", href: "/admin" }] : [])
  ];
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-end gap-4">
        <NavActions size="sm" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white min-h-11 min-w-11 ml-1" 
          onClick={toggleMenu}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
      
      {isOpen && (
        <div className="md:hidden pt-2 pb-3 space-y-1">
          <NavLinks 
            items={allNavItems} 
            isMobile={true} 
            onNavItemClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
