
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import NavExpandableTabs from "./NavExpandableTabs";
import NavActions from "./NavActions";

interface MobileMenuProps {
  // Remove navItems prop since NavExpandableTabs has its own items
}

const MobileMenu: React.FC<MobileMenuProps> = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleTabChange = () => {
    // Close menu when navigation occurs
    setIsOpen(false);
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
        <div className="md:hidden pt-4 pb-3">
          <NavExpandableTabs 
            isMobile={true}
            onChange={handleTabChange}
          />
        </div>
      )}
    </div>
  );
};

export default MobileMenu;
