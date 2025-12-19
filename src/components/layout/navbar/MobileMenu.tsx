
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </motion.div>
        </Button>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="md:hidden pt-2 pb-3 space-y-1 overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <NavLinks 
              isMobile={true} 
              onLinkClick={() => setIsOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileMenu;
