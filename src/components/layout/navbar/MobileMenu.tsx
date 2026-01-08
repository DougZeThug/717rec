
import React, { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NavLinks from "./NavLinks";
import NavActions from "./NavActions";
import { useAdminAccess } from "@/hooks/useAdminAccess";

interface MobileMenuProps {
  navItems: Array<{ label: string; href: string }>;
}

const MobileMenu: React.FC<MobileMenuProps> = React.memo(({ navItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdminAccessGranted } = useAdminAccess();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  // Memoize toggle handler
  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Memoize close handler for NavLinks
  const handleLinkClose = useCallback(() => {
    setIsOpen(false);
  }, []);

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
            layout={false}
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
              onLinkClick={handleLinkClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MobileMenu.displayName = 'MobileMenu';

export default MobileMenu;
