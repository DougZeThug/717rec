import React, { useMemo } from 'react';

import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';

import MobileMenu from './navbar/MobileMenu';
import NavActions from './navbar/NavActions';
// Import component files
import NavBrand from './navbar/NavBrand';
import NavLinks from './navbar/NavLinks';

const Navbar: React.FC = React.memo(() => {
  // Use base theme hook - no location dependency
  const { isWinterTheme } = useSeasonalThemeBase();

  // Memoize navItems to prevent recreating on each render
  const navItems = useMemo(
    () => [
      { label: 'Home', href: '/' },
      { label: 'Teams', href: '/teams' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Standings', href: '/stats' },
      { label: 'Playoffs', href: '/playoffs' },
    ],
    []
  );

  return (
    <nav
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
});

Navbar.displayName = 'Navbar';

export default Navbar;
