
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
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-end gap-2">
        <NavActions size="sm" />
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-white min-h-11 min-w-11" 
          onClick={toggleMenu}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
      
      {isOpen && (
        <div className="md:hidden pt-2 pb-3 space-y-1">
          <NavLinks 
            isMobile={true} 
            onLinkClick={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
