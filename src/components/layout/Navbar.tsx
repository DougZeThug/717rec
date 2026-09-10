import React from 'react';

import CommandPalette from '@/components/navigation/CommandPalette';
import { useIsMobile } from '@/hooks/useMobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import MobileMenu from './navbar/MobileMenu';
import NavActions from './navbar/NavActions';
// Import component files
import NavBrand from './navbar/NavBrand';
import NavLinks from './navbar/NavLinks';

/** Skip link, first in the tab order and visible only once focused. */
const SkipToContent: React.FC = () => (
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-white focus:text-cornhole-navy focus:rounded-md focus:shadow-lg focus:ring-2 focus:ring-cornhole-navy focus:ring-offset-2"
  >
    Skip to main content
  </a>
);

/**
 * Everything to the right of the brand: the desktop link row, the search
 * trigger, and the hamburger that replaces the row below `lg`.
 *
 * Split out of `Navbar` to keep the JSX shallow — the header is four elements
 * deep before it reaches any of this.
 */
const NavbarControls: React.FC<{ isMobile: boolean }> = ({ isMobile }) => (
  <div className="flex items-center gap-2">
    <div className="hidden lg:flex items-center space-x-1">
      <NavLinks />

      {/* Add desktop nav actions with proper spacing */}
      <NavActions className="ml-4" />
    </div>

    {/* The palette used to be mounted by `DesktopNav`, the pill bar under the
        page content that X-02 removed. That bar returned null below 768 px, so
        this is rendered rather than merely hidden: a CSS-hidden palette would
        still attach its ⌘K listener on a phone, where there is no way to press
        it. */}
    {!isMobile && <CommandPalette />}

    {/* Mobile menu with hamburger */}
    <MobileMenu />
  </div>
);

const Navbar: React.FC = React.memo(() => {
  // Use base theme hook - no location dependency
  const { isWinterTheme } = useSeasonalThemeBase();
  const isMobile = useIsMobile();

  return (
    <>
      <SkipToContent />
      <nav
        aria-label="Primary"
        className={cn(
          'text-white shadow-lg sticky top-0 z-50 safe-area-top relative',
          // Default theme
          !isWinterTheme &&
            'bg-gradient-to-r from-[#0f2647] via-cornhole-navy to-[#1d4068] dark:from-gray-900 dark:via-gray-900 dark:to-gray-800',
          // Winter theme - ice glass effect
          isWinterTheme && 'navbar-winter'
        )}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2 md:py-1">
            <div className="flex items-center">
              <NavBrand />
            </div>

            <NavbarControls isMobile={isMobile} />
          </div>
        </div>
      </nav>
    </>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
