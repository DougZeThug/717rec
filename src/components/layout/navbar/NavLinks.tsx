import {
  BarChart3,
  Calendar,
  Clock,
  HelpCircle,
  Home,
  Mail,
  MessageSquare,
  Trophy,
  Users,
} from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { NavLink } from 'react-router';

import { useAdminAccess } from '@/hooks/useAdminAccess';
import { cn } from '@/lib/utils';
import { ICON_SIZES, ICON_STROKE } from '@/styles/icon-system';
import { prefetchRoute } from '@/utils/routePrefetch';

interface NavLinksProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = React.memo(({ isMobile = false, onLinkClick }) => {
  const { _isAdminAccessGranted } = useAdminAccess();
  const activeClass = 'bg-white/20 dark:bg-slate-700 text-white dark:text-white';
  const baseClass = isMobile
    ? 'flex items-center w-full px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cornhole-navy'
    : 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent hover:text-muted-foreground h-9 px-4';

  // Memoize handler to prevent recreating on each render
  const handleLinkClick = useCallback(() => {
    onLinkClick?.();
  }, [onLinkClick]);

  // Memoize navItems to prevent recreating on each render
  const navItems = useMemo(
    () => [
      { href: '/', label: 'Home', icon: Home },
      { href: '/teams', label: 'Teams', icon: Users },
      { href: '/schedule', label: 'Schedule', icon: Calendar },
      { href: '/stats', label: 'Standings', icon: BarChart3 },
      { href: '/playoffs', label: 'Playoffs', icon: Trophy },
      { href: '/history', label: 'History', icon: Clock },
      { href: '/message-board', label: 'Messages', icon: MessageSquare },
      { href: '/help', label: 'Help', icon: HelpCircle },
      { href: '/contact', label: 'Contact', icon: Mail },
    ],
    []
  );

  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          onClick={handleLinkClick}
          onMouseEnter={() => prefetchRoute(item.href)}
          onFocus={() => prefetchRoute(item.href)}
          onTouchStart={() => prefetchRoute(item.href)}
          className={({ isActive }) =>
            cn(baseClass, isActive && !isMobile ? activeClass : undefined)
          }
        >
          {({ isActive }) => (
            <>
              <item.icon
                size={ICON_SIZES.md}
                strokeWidth={isActive ? ICON_STROKE.bold : ICON_STROKE.normal}
                className={isMobile ? 'mr-3' : 'mr-2'}
              />
              <span className={isMobile ? 'text-base' : ''}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
});

NavLinks.displayName = 'NavLinks';

export default NavLinks;
