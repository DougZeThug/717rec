import { AnimatePresence, m } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/button';
import { useAdminAccess } from '@/hooks/useAdminAccess';

import NavActions from './NavActions';
import NavLinks from './NavLinks';

interface MobileMenuProps {
  navItems: Array<{ label: string; href: string }>;
}

const MobileMenu: React.FC<MobileMenuProps> = React.memo(({ navItems: _navItems }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAdminAccessGranted: _isAdminAccessGranted } = useAdminAccess();
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Memoize toggle handler
  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Memoize close handler for NavLinks
  const handleLinkClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <div className="md:hidden" style={{ minWidth: '120px', minHeight: '44px' }}>
      <div className="flex items-center justify-end gap-2">
        <NavActions size="sm" />
        <Button
          variant="ghost"
          size="icon"
          className="text-white min-h-11 min-w-11"
          onClick={toggleMenu}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          style={{ width: '44px', height: '44px' }}
        >
          <m.div
            layout={false}
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </m.div>
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.div
            className="md:hidden pt-2 pb-3 space-y-1 overflow-hidden"
            initial={{ opacity: 0, maxHeight: 0 }}
            animate={{ opacity: 1, maxHeight: '500px' }}
            exit={{ opacity: 0, maxHeight: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <NavLinks isMobile={true} onLinkClick={handleLinkClose} />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MobileMenu.displayName = 'MobileMenu';

export default MobileMenu;
