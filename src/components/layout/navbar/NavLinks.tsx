import {
  BarChart3,
  Calendar,
  Clock,
  HelpCircle,
  Home,
  Mail,
  MessageSquare,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router';

import { useAdminAccess } from '@/hooks/useAdminAccess';
import { cn } from '@/lib/utils';
import { ICON_SIZES, ICON_STROKE } from '@/styles/icon-system';
import { isAdminConsolePath } from '@/utils/adminPath';
import { prefetchRoute } from '@/utils/routePrefetch';
import { confirmLeavingClick } from '@/utils/unsavedChanges';

interface NavLinksProps {
  isMobile?: boolean;
  onLinkClick?: () => void;
}

const NavLinks: React.FC<NavLinksProps> = React.memo(({ isMobile = false, onLinkClick }) => {
  const { isAdminAccessGranted, isLoading: adminCheckLoading } = useAdminAccess();
  const { pathname } = useLocation();
  const activeClass = 'bg-white/20 text-white';
  // Held back until the profile has loaded, so Admin does not appear late.
  const showAdminLink = isAdminAccessGranted && !adminCheckLoading;
  // The row holds nine links, three account controls, the search button and —
  // for an admin — Admin, inside a container that stops growing at 1368px, and
  // the brand keeps its full width beside it. Full pills (px-3, label and icon)
  // need about 1320px. With Admin they would overflow the container by 11px even
  // at the widest window, so Admin keeps px-2 at every width. Short of about
  // 1280 (1340 with Admin) only the icon shows, with the label left for screen
  // readers: at 1024 the row ran 244px past the window and pushed Sign in, the
  // theme toggle and search out of sight. Each class is written out whole so
  // that Tailwind finds it.
  const desktopFit = showAdminLink
    ? {
        padding: 'px-2',
        icon: 'min-[1340px]:mr-2',
        label: 'max-[1340px]:sr-only',
      }
    : { padding: 'px-2 min-[1320px]:px-3', icon: 'xl:mr-2', label: 'max-xl:sr-only' };
  const baseClass = isMobile
    ? 'flex items-center w-full px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-cornhole-navy'
    : `inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-accent hover:text-muted-foreground h-9 ${desktopFit.padding}`;

  // Memoize handler to prevent recreating on each render
  const handleLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      // Inside the console, Admin has nowhere to go: `/admin` reopens the
      // section already on screen, and the redirect unmounts it on the way,
      // taking any unsaved work with it. See `isAdminConsolePath`.
      if (href === '/admin' && isAdminConsolePath(pathname)) {
        event.preventDefault();
        return;
      }
      // Every other link really does leave. The console shares this header with
      // the public pages, so these were the quickest way to lose unsaved work
      // without being asked. Returning early keeps the phone menu open too.
      if (!confirmLeavingClick(event)) return;
      onLinkClick?.();
    },
    [onLinkClick, pathname]
  );

  // Memoize navItems to prevent recreating on each render
  const navItems = useMemo(() => {
    const items = [
      { href: '/', label: 'Home', icon: Home },
      { href: '/teams', label: 'Teams', icon: Users },
      { href: '/schedule', label: 'Schedule', icon: Calendar },
      { href: '/stats', label: 'Standings', icon: BarChart3 },
      { href: '/playoffs', label: 'Playoffs', icon: Trophy },
      { href: '/history', label: 'History', icon: Clock },

      { href: '/message-board', label: 'Messages', icon: MessageSquare },
      { href: '/help', label: 'Help', icon: HelpCircle },
      { href: '/contact', label: 'Contact', icon: Mail },
    ];

    // X-03: the Admin Panel used to be reachable from the user menu and nowhere
    // else. This list is rendered both across the header and inside the phone
    // hamburger, so one entry here puts it in the primary navigation on both.
    if (showAdminLink) {
      items.push({ href: '/admin', label: 'Admin', icon: Shield });
    }

    return items;
  }, [showAdminLink]);

  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.label}
          to={item.href}
          onClick={(event) => handleLinkClick(event, item.href)}
          onMouseEnter={() => prefetchRoute(item.href)}
          onFocus={() => prefetchRoute(item.href)}
          onTouchStart={() => prefetchRoute(item.href)}
          // The icon-only desktop pills have no visible name, so give a mouse
          // user one on hover.
          title={isMobile ? undefined : item.label}
          className={({ isActive }) => cn(baseClass, isActive ? activeClass : undefined)}
        >
          {({ isActive }) => (
            <>
              <item.icon
                size={ICON_SIZES.md}
                strokeWidth={isActive ? ICON_STROKE.bold : ICON_STROKE.normal}
                className={isMobile ? 'mr-3' : desktopFit.icon}
              />
              <span className={isMobile ? 'text-base' : desktopFit.label}>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </>
  );
});

NavLinks.displayName = 'NavLinks';

export default NavLinks;
