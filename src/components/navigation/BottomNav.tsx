import { Award, Calendar, Users } from 'lucide-react';
import React, { useMemo } from 'react';
import { useLocation } from 'react-router';

import { NavItem } from '@/components/navigation/NavItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { ICON_SIZES } from '@/styles/icon-system';

export const BottomNav = React.memo(() => {
  const location = useLocation();
  const isMobile = useIsMobile();
  // Use base theme hook - no homepage dependency needed
  const { isWinterTheme } = useSeasonalThemeBase();

  // Memoize navItems to prevent recreating on each render
  const navItems = useMemo(
    () => [
      {
        path: '/stats',
        label: 'Standings',
        icon: <Award size={ICON_SIZES.xl} />,
      },
      {
        path: '/schedule',
        label: 'Schedule',
        icon: <Calendar size={ICON_SIZES.xl} />,
      },
      {
        path: '/teams',
        label: 'Teams',
        icon: <Users size={ICON_SIZES.xl} />,
      },
    ],
    []
  );

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'pb-[env(safe-area-inset-bottom,0px)]',
        // Default theme
        !isWinterTheme && [
          'bg-background/80 backdrop-blur-lg',
          'border-t border-border',
          'shadow-[0_-1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_-1px_3px_rgba(0,0,0,0.2)]',
        ],
        // Winter theme - ice glass
        isWinterTheme && 'bottom-nav-winter'
      )}
    >
      <div className="flex justify-around items-center max-w-md mx-auto h-16">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            to={item.path}
            label={item.label}
            icon={item.icon}
            className={cn(
              'flex-1 px-3 py-1.5 text-sm',
              'flex flex-col items-center justify-center',
              location.pathname === item.path &&
                'bg-gradient-to-b from-transparent to-blue-50/40 dark:to-blue-900/10'
            )}
          />
        ))}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
