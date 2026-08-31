import { AnimatePresence, m } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import { Button } from '@/components/ui/button';

import NavActions from './NavActions';
import NavLinks from './NavLinks';

const PANEL_ID = 'mobile-navigation-panel';

/**
 * The narrow-screen navigation menu.
 *
 * This is a disclosure, not a dialog: the panel expands in place under the top
 * bar rather than covering the page. It therefore uses `aria-expanded` and
 * `aria-controls` rather than a dialog role, and it does not trap focus. It
 * does move focus into the panel when it opens, close on Escape, and return
 * focus to the button afterwards.
 */
const MobileMenu: React.FC = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Tracks whether the last close was driven by the keyboard, so focus is
  // returned to the button only when a keyboard user asked for it.
  const returnFocusRef = useRef(false);

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

  // Escape closes the menu and gives the button its focus back.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      returnFocusRef.current = true;
      setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Move focus into the panel on open, and back to the button on an Escape close.
  useEffect(() => {
    if (isOpen) {
      document.getElementById(PANEL_ID)?.querySelector<HTMLElement>('a, button')?.focus();
    } else if (returnFocusRef.current) {
      returnFocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="md:hidden" style={{ minWidth: '120px', minHeight: '44px' }}>
      <div className="flex items-center justify-end gap-2">
        <NavActions size="sm" />
        <Button
          ref={triggerRef}
          variant="ghost"
          size="icon"
          className="text-white min-h-11 min-w-11"
          onClick={toggleMenu}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls={PANEL_ID}
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
            id={PANEL_ID}
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
